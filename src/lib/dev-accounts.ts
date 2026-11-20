import "server-only";
import { headers } from "next/headers";
import { databaseUrl } from "./db/config";

export async function devAccountsEnabled() {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_ACCOUNT_PICKER !== "1" || process.env.VERCEL) return false;
  const dbHost = new URL(databaseUrl()).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(dbHost)) return false;
  const h = await headers();
  const host = h.get("host") ?? "";
  const forwarded = h.get("x-forwarded-host");
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) && (!forwarded || forwarded === host);
}
