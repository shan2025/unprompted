import "server-only";
import { normalizeLink } from "./links";

export function isCompanyOwner(user: { id: number } | null) {
  return !!user && String(user.id) === process.env.COMPANY_OWNER_USER_ID?.trim();
}

export function merchStoreUrl() {
  const url = normalizeLink(process.env.MERCH_STORE_URL ?? "");
  return url?.startsWith("https://") ? url : null;
}
