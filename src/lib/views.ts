import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { databaseUrl } from "./db/config";

// A secret mixed into each hash, so a copy of the database alone can't be
// used to guess IP addresses back out of it. VIEW_SALT can be set to anything;
// without it, the database password (which a copy of the data doesn't hold) is used.
const salt = () => process.env.VIEW_SALT ?? databaseUrl();

const BOTS =/bot|crawl|spider|slurp|preview|fetch|curl|wget|python|headless|lighthouse/i;

/**
 * Counts one view of a post. Each visitor counts once per post per day, so
 * refreshing doesn't add views. Visitors are a hash of who they are (their
 * account, or their IP address and browser when logged out) and the day,
 * so the raw IP address is never stored and nobody can be tracked across days.
 */
export async function recordView(postId: number, who: { userId: number | null; ip: string; userAgent: string }) {
  if (!who.userAgent || BOTS.test(who.userAgent)) return;
  const day = new Date().toISOString().slice(0, 10);
  const identity = who.userId !== null ? `u:${who.userId}` : `a:${who.ip}|${who.userAgent}`;
  const visitor = createHash("sha256").update(`${salt()}|${day}|${identity}`).digest("base64url").slice(0, 22);
  await db.execute(sql`
    insert into post_views (post_id, day, visitor) values (${postId}, ${day}, ${visitor})
    on conflict do nothing`);
}
