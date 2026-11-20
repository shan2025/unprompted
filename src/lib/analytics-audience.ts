import "server-only";
import type { SessionUser } from "./auth";

export function ga4RunsInThisEnvironment() {
  const vercelEnvironment = process.env.VERCEL_ENV;
  return process.env.NODE_ENV === "production" && (!vercelEnvironment || vercelEnvironment === "production");
}

export function ga4TracksVisitor(user: Pick<SessionUser, "id" | "email" | "role"> | null) {
  if (!user) return true;
  const accountId = String(user.id);
  if (user.role === "admin" || accountId === process.env.COMPANY_OWNER_USER_ID?.trim()) return false;

  const teamAccounts = (process.env.GA4_EXCLUDED_ACCOUNTS ?? "")
    .split(",")
    .map((account) => account.trim().toLowerCase());
  return !teamAccounts.includes(accountId) && !(user.email && teamAccounts.includes(user.email.toLowerCase()));
}
