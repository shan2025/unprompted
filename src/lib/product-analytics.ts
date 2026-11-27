// PostHog settings shared by the browser and the server. No secrets here: the project key is public.

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();

export const posthogKey = key && /^phc_[A-Za-z0-9]+$/.test(key) ? key : undefined;

/** Ingestion address, e.g. https://us.i.posthog.com or https://eu.i.posthog.com. */
export const posthogHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com").replace(/\/+$/, "");

/** Pages with private text (messages, orders, addresses, admin, sign-in): never recorded in session replays. */
const privatePrefixes = ["/chat", "/dashboard", "/admin", "/login", "/signup", "/forgot-password", "/reset-password"];

export function isPrivatePage(pathname: string) {
  return privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Drops the query string except campaign tags, so reset tokens and the like never leave the site. */
export function scrubUrl(value: unknown): unknown {
  if (typeof value !== "string" || !value.includes("?")) return value;
  try {
    const url = new URL(value);
    const kept = new URLSearchParams();
    url.searchParams.forEach((v, k) => {
      if (k.startsWith("utm_")) kept.set(k, v);
    });
    url.search = kept.toString();
    url.hash = "";
    return url.toString();
  } catch {
    return value.split("?")[0];
  }
}

export function isAddress(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}
