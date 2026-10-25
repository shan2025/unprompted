import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { databaseConfig } from "./config";
import * as schema from "./schema";

const { url, authToken } = databaseConfig();

if (url.startsWith("file:")) {
  mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
}

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { libsql?: Client };
const client = globalForDb.libsql ?? createClient({ url, authToken });
if (process.env.NODE_ENV !== "production") globalForDb.libsql = client;

export const db = drizzle(client, { schema });
export { schema };
