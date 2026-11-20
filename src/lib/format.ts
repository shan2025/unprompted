import { currencyOf } from "./currency";

/** A price tag: a zero price reads "Free". `currency` is the listing's own, shown as entered. */
export function formatPrice(cents: number, currency?: string) {
  return cents === 0 ? "Free" : formatMoney(cents, currency);
}

/** An amount of money, such as a total, where zero is "$0". Amounts are in the smallest unit (cents, paise). */
export function formatMoney(cents: number, currency?: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyOf(currency),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/** "Nov 4", with the year only when it isn't this year. */
export function formatShortDate(date: Date) {
  const thisYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("en-US", thisYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? word : pluralWord}`;
}

/** `text` on one line, at most `max` characters, cut at a word with "…" when it runs long. For search snippets. */
export function snippet(text: string, max = 155) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  // One very long word: cut inside it rather than leave almost nothing.
  const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${kept.replace(/[\s,.;:!?–—-]+$/, "")}…`;
}

export function siteUrl() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL ?? (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}

/** Only allow same-site relative redirects. */
export function safeNext(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  // Parsed the way a browser will: "/\evil.com" and "/\t/evil.com" both leave the site.
  const base = "http://same-site.invalid";
  try {
    const url = new URL(value, base);
    return url.origin === base && !url.pathname.startsWith("//") ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
