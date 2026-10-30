"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { createSession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";
import { hashPassword } from "@/lib/password";
import { clientIp, withinLimit } from "@/lib/rate-limit";

const { users, sessions, passwordResets } = schema;

const MIN_PASSWORD = 8;
const LINK_MINUTES = 60;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type ForgotState = { sent?: boolean; error?: string; email?: string } | null;

export async function requestPasswordReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };

  const ipOk = await withinLimit(`reset:ip:${await clientIp()}`, 10, 60 * 60);
  const emailOk = await withinLimit(`reset:email:${email}`, 3, 60 * 60);
  if (!ipOk || !emailOk) return { error: "Too many reset requests. Try again in an hour.", email };

  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const token = randomBytes(32).toString("base64url");
    await db.insert(passwordResets).values({
      id: sha256(token),
      userId: user.id,
      expiresAt: sql`now() + make_interval(mins => ${LINK_MINUTES})`,
    });
    const link = `${siteUrl()}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Reset your Unprompters password",
      text: `Hi ${user.name},\n\nUse this link to choose a new password. It works once and expires in ${LINK_MINUTES} minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password hasn't changed.\n\nUnprompters`,
      html: `<p>Hi ${escapeHtml(user.name)},</p><p>Use this link to choose a new password. It works once and expires in ${LINK_MINUTES} minutes:</p><p><a href="${link}">Choose a new password</a></p><p>If you didn't ask for this, you can ignore this email; your password hasn't changed.</p><p>Unprompters</p>`,
    });
  }
  // Same answer whether or not the account exists, so emails can't be probed.
  return { sent: true, email };
}

export type ResetState = { error?: string; next?: string } | null;

export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) return { error: `Use a password of at least ${MIN_PASSWORD} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };
  if (!(await withinLimit(`reset-use:ip:${await clientIp()}`, 20, 60 * 60))) {
    return { error: "Too many attempts. Try again in an hour." };
  }

  // Claim the token in one statement so it can only ever be used once.
  const [claimed] = await db
    .update(passwordResets)
    .set({ usedAt: sql`now()` })
    .where(and(eq(passwordResets.id, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, sql`now()`)))
    .returning({ userId: passwordResets.userId });
  if (!claimed) return { error: "This link has expired or was already used. Ask for a new one." };

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, claimed.userId));
  // Sign out everywhere else and retire any other outstanding links.
  await db.delete(sessions).where(eq(sessions.userId, claimed.userId));
  await db
    .update(passwordResets)
    .set({ usedAt: sql`now()` })
    .where(and(eq(passwordResets.userId, claimed.userId), isNull(passwordResets.usedAt)));

  await createSession(claimed.userId);
  return { next: "/dashboard" };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
