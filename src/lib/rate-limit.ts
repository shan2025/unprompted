import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "./db";

/**
 * Counts one attempt against `key` and says whether it is still within
 * `limit` attempts per `windowSeconds`. The count lives in Postgres and is
 * updated in a single statement, so it holds across serverless instances.
 */
export async function withinLimit(key: string, limit: number, windowSeconds: number) {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}::int))
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now() then excluded.reset_at else rate_limits.reset_at end
    returning count`);
  // Occasionally clear out long-expired counters.
  if (Math.random() < 0.01) await db.execute(sql`delete from rate_limits where reset_at < now() - interval '1 day'`);
  return Number(rows[0]?.count ?? 0) <= limit;
}

/** The visitor's IP address, as reported by the hosting platform. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
