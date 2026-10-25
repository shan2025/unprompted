import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// A local SQLite file by default. Point DATABASE_URL at a hosted libSQL
// database (e.g. Turso) for serverless deployments; the code is the same.
const url = process.env.DATABASE_URL ?? "file:./data/unprompted.db";

if (url.startsWith("file:")) {
  mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
}

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { libsql?: Client };
const client = globalForDb.libsql ?? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
if (process.env.NODE_ENV !== "production") globalForDb.libsql = client;

export const db = drizzle(client, { schema });
export { schema };
