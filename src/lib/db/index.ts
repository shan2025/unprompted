import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl, isLocalDatabase } from "./config";
import * as schema from "./schema";

const url = databaseUrl();

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pg?: postgres.Sql };
const client =
  globalForDb.pg ??
  postgres(url, {
    // Supabase's transaction pooler doesn't support prepared statements.
    prepare: false,
    ssl: isLocalDatabase(url) ? false : "require",
    // Serverless functions each hold their own pool, so keep it small.
    max: process.env.VERCEL ? 1 : 10,
    onnotice: () => {},
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };

/** Close the pool so command-line scripts can exit. */
export function closeDb() {
  return client.end();
}
