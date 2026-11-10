import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "./db";
import { HANDLE_MAX, HANDLE_MIN } from "./handle-rules";

const RESERVED = new Set(["admin", "api", "explore", "sell", "dashboard", "login", "signup", "standard", "team", "unprompted", "unprompters", "privacy", "terms", "refunds", "contact", "start"]);

/** A free public profile handle, made from the name: "Shan K." -> "shank". */
export async function makeHandle(name: string) {
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

/** Why a handle someone typed can't be used, or null when it's free for them. */
export async function handleProblem(handle: string, userId: number): Promise<string | null> {
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX)
    return `Your profile link needs ${HANDLE_MIN} to ${HANDLE_MAX} characters.`;
  if (!/^[a-z0-9_]+$/.test(handle)) return "Use only letters, numbers and underscores in your profile link.";
  if (RESERVED.has(handle)) return "That profile link is taken. Try another.";
  const [taken] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.handle, handle), ne(schema.users.id, userId)))
    .limit(1);
  return taken ? "That profile link is taken. Try another." : null;
}
