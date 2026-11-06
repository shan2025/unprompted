import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { homePath } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { safeNext } from "@/lib/format";
import { GOOGLE_COOKIE, googleEnabled, googleProfile } from "@/lib/google";
import { makeHandle } from "@/lib/handles";
import { hashPassword } from "@/lib/password";
import { clientIp, withinLimit } from "@/lib/rate-limit";

/**
 * Google sends people back here. Someone whose verified Google email already has
 * an account is logged into it; anyone else gets a new account.
 */
export async function GET(request: NextRequest) {
  if (!googleEnabled()) redirect("/login?error=google-off");

  const store = await cookies();
  const saved = store.get(GOOGLE_COOKIE)?.value;
  store.delete({ name: GOOGLE_COOKIE, path: "/api/auth/google" });

  let started: { state?: string; verifier?: string; next?: string } = {};
  try {
    started = saved ? JSON.parse(saved) : {};
  } catch {}

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  // Pressing Cancel on Google's screen isn't an error worth shouting about.
  if (params.get("error") === "access_denied") redirect(started.next ? `/login?next=${encodeURIComponent(started.next)}` : "/login");
  // The state must match the one we set, or this request didn't start here.
  if (!code || !started.state || !started.verifier || params.get("state") !== started.state) redirect("/login?error=google");

  const profile = await googleProfile(code, started.verifier);
  if (!profile) redirect("/login?error=google");

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, profile.email)).limit(1);
  if (existing) {
    await createSession(existing.id);
    redirect(safeNext(started.next, await homePath(existing.id)));
  }

  if (!(await withinLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60))) redirect("/login?error=google-limit");

  // The account gets a random password nobody knows. "Forgot password?" sets a
  // real one, for anyone who later wants to log in without Google.
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  for (let attempt = 0; attempt < 3; attempt++) {
    const [user] = await db
      .insert(schema.users)
      .values({ name: profile.name, handle: await makeHandle(profile.name), email: profile.email, passwordHash })
      .onConflictDoNothing()
      .returning({ id: schema.users.id });
    if (user) {
      await createSession(user.id);
      redirect(safeNext(started.next, "/explore"));
    }
    // Signed up with this email a moment ago, in another tab.
    const [raced] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, profile.email)).limit(1);
    if (raced) {
      await createSession(raced.id);
      redirect(safeNext(started.next, await homePath(raced.id)));
    }
  }
  redirect("/login?error=google");
}
