"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { createSession, destroySession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { homePath } from "@/lib/data";
import { safeNext } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearLimits, clientIp, withinLimit } from "@/lib/rate-limit";

// On success the form does a full page load to `next`, rather than an in-app
// redirect, so no page remembered from before the login change is reused.
export type AuthState = { error?: string; next?: string; values?: { email?: string; name?: string } } | null;

const RESERVED = new Set(["admin", "api", "explore", "sell", "dashboard", "login", "signup", "standard", "team", "unprompted", "unprompters", "privacy", "terms", "refunds", "contact", "start"]);
const MIN_PASSWORD = 8;

// Public profile handle, made from the name: "Shan K." -> "shank".
async function makeHandle(name: string) {
  let base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 18);
  if (base.length < 3 || RESERVED.has(base)) base = `${base}user`.slice(0, 18);
  for (let i = 0; ; i++) {
    const handle = i === 0 ? base : `${base}${randomInt(10, 10_000)}`;
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, handle)).limit(1);
    if (!taken) return handle;
  }
}

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const values = { name, email };

  if (name.length < 1 || name.length > 60) return { error: "Please enter your name.", values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", values };
  if (password.length < MIN_PASSWORD) return { error: `Use a password of at least ${MIN_PASSWORD} characters.`, values };
  if (!(await withinLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60))) {
    return { error: "Too many new accounts from this connection. Try again in an hour.", values };
  }

  const emailTaken = async () => {
    const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return Boolean(row);
  };
  const takenError = { error: "That email already has an account. Try logging in.", values };
  if (await emailTaken()) return takenError;

  // Another signup can take this email or handle after the checks above, so let
  // the unique indexes decide. If it was the handle, the next try picks another.
  const passwordHash = await hashPassword(password);
  for (let attempt = 0; attempt < 3; attempt++) {
    const [user] = await db
      .insert(schema.users)
      .values({ name, handle: await makeHandle(name), email, passwordHash })
      .onConflictDoNothing()
      .returning({ id: schema.users.id });
    if (user) {
      await createSession(user.id);
      return { next: safeNext(fd.get("next"), "/explore") };
    }
    if (await emailTaken()) return takenError;
  }
  return { error: "We couldn't create your account. Please try again.", values };
}

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");

  // Checked before the password, so guesses are capped whether right or wrong.
  // The tight cap is per email and connection, so a stranger guessing can't lock
  // the owner out. The per-email cap only trips on guesses from many connections.
  const ip = await clientIp();
  const pairKey = `login:pair:${email}:${ip}`;
  if (!(await withinLimit(`login:ip:${ip}`, 30, 15 * 60))) {
    return { error: "Too many log-in attempts from this connection. Wait 15 minutes.", values: { email } };
  }
  const pairOk = await withinLimit(pairKey, 10, 15 * 60);
  const emailOk = await withinLimit(`login:email:${email}:`, 100, 15 * 60);
  if (!pairOk || !emailOk) {
    return { error: "Too many log-in attempts. Wait 15 minutes, or reset your password.", values: { email } };
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match.", values: { email } };
  }
  await clearLimits(pairKey);
  await createSession(user.id);
  return { next: safeNext(fd.get("next"), await homePath(user.id)) };
}

export async function logout() {
  await destroySession();
}
