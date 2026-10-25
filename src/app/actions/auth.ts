"use server";

import { eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { safeNext } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthState = { error?: string; values?: { email?: string; name?: string; handle?: string } } | null;

const RESERVED = new Set(["admin", "api", "explore", "sell", "dashboard", "login", "signup", "standard", "unprompted"]);

export async function signup(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const name = String(fd.get("name") ?? "").trim();
  const handle = String(fd.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const values = { name, handle, email };

  if (name.length < 2 || name.length > 60) return { error: "Your name should be 2 to 60 characters.", values };
  if (!/^[a-z0-9_]{3,24}$/.test(handle) || RESERVED.has(handle)) {
    return { error: "Handles are 3 to 24 lowercase letters, numbers or underscores.", values };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", values };
  if (password.length < 10) return { error: "Use a password of at least 10 characters.", values };

  const [taken] = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.handle, handle)))
    .limit(1);
  if (taken) {
    return { error: taken.email === email ? "That email already has an account." : "That handle is taken.", values };
  }

  const [user] = await db
    .insert(schema.users)
    .values({ name, handle, email, passwordHash: await hashPassword(password) })
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
