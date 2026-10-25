"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { safeNext } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthState = { error?: string; values?: { email?: string; name?: string } } | null;

const RESERVED = new Set(["admin", "api", "explore", "sell", "dashboard", "login", "signup", "standard", "team", "unprompted"]);
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

  const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (taken) return { error: "That email already has an account. Try logging in.", values };

  const [user] = await db
    .insert(schema.users)
    .values({ name, handle: await makeHandle(name), email, passwordHash: await hashPassword(password) })
    .returning({ id: schema.users.id });
  await createSession(user.id);
  redirect(safeNext(fd.get("next"), "/dashboard"));
}

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "That email and password don't match.", values: { email } };
  }
  await createSession(user.id);
  redirect(safeNext(fd.get("next"), "/dashboard"));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
