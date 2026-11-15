"use server";

import { randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createSession, getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email-verification";
import { safeNext } from "@/lib/format";
import { makeHandle } from "@/lib/handles";
import { hashPassword } from "@/lib/password";
import { checkCode, issueCode } from "@/lib/phone-codes";
import { parsePhone } from "@/lib/phone";
import { phoneLoginEnabled } from "@/lib/sms";

const { users } = schema;

const NUMBER_HELP = "Enter your mobile number, with the country code if you're outside India.";

const findByPhone = async (phone: string) => {
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
  return row ?? null;
};

const validName = (name: string) => name.length >= 1 && name.length <= 60;

/**
 * Log in or sign up with a phone number, from the "Email or phone number" box.
 * Step one texts a code; step two checks it. A number we don't know yet becomes
 * a new account, using the name from the sign-up form or asked for with the code.
 */
export type PhoneLoginState = {
  step: "number" | "code";
  phone?: string;
  /** The name typed on the sign-up form, kept for when the account is made. */
  name?: string;
  /** No account has this number yet. */
  isNew?: boolean;
  error?: string;
  /** Where to go after logging in; the form does a full page load there. */
  next?: string;
  /** A fresh code went out (for "Send a new code"). */
  resent?: boolean;
} | null;

export async function phoneLogin(prev: PhoneLoginState, fd: FormData): Promise<PhoneLoginState> {
  if (!phoneLoginEnabled()) return { step: "number", error: "Logging in with a phone number isn't available yet. Use your email." };
  const intent = String(fd.get("intent") ?? "send");
  const typedName = String(fd.get("name") ?? "").trim();
  const name = typedName || prev?.name || undefined;

  if (intent === "change") return { step: "number", phone: prev?.phone, name };

  if (intent === "send" || intent === "resend") {
    const phone = parsePhone(String(fd.get("identifier") ?? prev?.phone ?? ""));
    if (!phone) return { step: "number", name, error: NUMBER_HELP };
    // The sign-up form asks for a name up front; check it before spending a text.
    if (fd.get("mode") === "signup" && !validName(typedName)) return { step: "number", phone, error: "Please enter your name." };
    const sent = await issueCode(phone);
    if (!sent.ok) return { step: intent === "resend" ? "code" : "number", phone, name, isNew: prev?.isNew, error: sent.error };
    return { step: "code", phone, name, isNew: !(await findByPhone(phone)), resent: intent === "resend" };
  }

  // intent === "verify"
  const phone = prev?.phone && parsePhone(prev.phone);
  if (!phone) return { step: "number", error: "Start again with your number." };
  const next = fd.get("next");

  const existing = await findByPhone(phone);
  if (!existing && !validName(name ?? "")) return { step: "code", phone, isNew: true, error: "Please enter your name." };
  if (!(await checkCode(phone, String(fd.get("code") ?? "")))) {
    return { step: "code", phone, name, isNew: !existing, error: "That code isn't right, or it has expired. Check it or send a new one." };
  }

  if (existing) {
    await createSession(existing.id);
    return { step: "code", phone, next: safeNext(next, await homePath(existing.id)) };
  }

  // Like a Google sign-up: a random password nobody knows. Adding an email later
  // and using "Forgot password?" sets a real one.
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  for (let attempt = 0; attempt < 3; attempt++) {
    const [user] = await db
      .insert(users)
      .values({ name: name!, handle: await makeHandle(name!), phone, passwordHash })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (user) {
      await createSession(user.id);
      return { step: "code", phone, next: safeNext(next, "/explore") };
    }
    // Signed up with this number a moment ago, in another tab.
    const raced = await findByPhone(phone);
    if (raced) {
      await createSession(raced.id);
      return { step: "code", phone, next: safeNext(next, await homePath(raced.id)) };
    }
  }
  return { step: "code", phone, name, isNew: true, error: "We couldn't create your account. Please try again." };
}

/** Adding a phone number to the account you're logged into, from Edit profile. Same two steps. */
export type LinkPhoneState = { step: "number" | "code"; phone?: string; error?: string; done?: boolean } | null;

export async function linkPhone(prev: LinkPhoneState, fd: FormData): Promise<LinkPhoneState> {
  const user = await getCurrentUser();
  if (!user) return { step: "number", error: "Log in first." };
  const intent = String(fd.get("intent") ?? "send");

  if (intent === "change") return { step: "number", phone: prev?.phone };

  if (intent === "remove") {
    // Keep at least one way in.
    if (!user.email) return { step: "number", error: "Add an email first, so you can still log in without your phone." };
    await db.update(users).set({ phone: null }).where(eq(users.id, user.id));
    revalidatePath("/dashboard/profile");
    return { step: "number" };
  }

  if (intent === "send") {
    if (!phoneLoginEnabled()) return { step: "number", error: "Adding a phone number isn't available yet." };
    const phone = parsePhone(String(fd.get("phone") ?? ""));
    if (!phone) return { step: "number", error: NUMBER_HELP };
    const owner = await findByPhone(phone);
    if (owner && owner.id !== user.id) return { step: "number", phone, error: "That number is already on another account." };
    const sent = await issueCode(phone);
    if (!sent.ok) return { step: "number", phone, error: sent.error };
    return { step: "code", phone };
  }

  const phone = prev?.phone && parsePhone(prev.phone);
  if (!phone) return { step: "number", error: "Start again with your number." };
  if (!(await checkCode(phone, String(fd.get("code") ?? "")))) {
    return { step: "code", phone, error: "That code isn't right, or it has expired." };
  }
  const [updated] = await db
    .update(users)
    .set({ phone })
    .where(eq(users.id, user.id))
    .returning({ id: users.id })
    .catch(() => []);
  if (!updated) return { step: "number", error: "That number is already on another account." };
  revalidatePath("/dashboard/profile");
  return { step: "number", done: true };
}

/** Lets a phone-only account add an email, so creators can reply and it can log in by email. */
export type AddEmailState = { error?: string; ok?: string } | null;

export async function addEmail(_prev: AddEmailState, fd: FormData): Promise<AddEmailState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in first." };
  if (user.email) return { error: "Your account already has an email." };
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };

  const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, email), ne(users.id, user.id))).limit(1);
  if (taken) return { error: "That email is already on another account." };
  const [updated] = await db
    .update(users)
    .set({ email, emailVerifiedAt: null })
    .where(eq(users.id, user.id))
    .returning({ id: users.id })
    .catch(() => []);
  if (!updated) return { error: "That email is already on another account." };

  await sendVerificationEmail({ id: user.id, name: user.name, email });
  revalidatePath("/dashboard/profile");
  return { ok: `Added. We sent a link to ${email} to confirm it.` };
}
