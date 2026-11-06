import "server-only";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

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
