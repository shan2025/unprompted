import type { Evidence } from "./scoring";

/** A URL identifies one source even if it is repeated under another evidence type. */
export function evidenceUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    url.hash = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    url.searchParams.sort();
    return url.href;
  } catch { return null; }
}

export function hasDuplicateEvidence(items: Evidence[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const keys = [item.url && evidenceUrl(item.url), item.fingerprint && `hash:${item.fingerprint}`, item.file && item.file !== "unsaved" && `file:${item.file}`].filter((v): v is string => Boolean(v));
    if (keys.some((key) => seen.has(key))) return true;
    keys.forEach((key) => seen.add(key));
  }
  return false;
}

export type EvidenceReview = { reviewerId: number; reviewedAt: string; note: string };
