export function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n.toLocaleString("en-US")} ${n === 1 ? word : pluralWord}`;
}

export function siteUrl() {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return (process.env.SITE_URL ?? (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}

/** Only allow same-site relative redirects. */
export function safeNext(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
