import "server-only";
import { after } from "next/server";
import { siteUrl } from "./format";

// IndexNow (https://www.indexnow.org) tells Bing, Yandex, Seznam and others that a
// page is new, changed or gone, so they crawl it now instead of whenever they next
// pass by. Bing feeds ChatGPT search and Copilot, so this is how new work reaches them.
//
// The key isn't a secret: it only proves the pings come from this site, and anyone
// can read it at /indexnow-key.txt. It covers every address on the site.
export const INDEXNOW_KEY = "efece47a17ef6e697f163f55b1b70d9b";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

/** Only the live site pings: never local work, previews, or a site without its own https address. */
function enabled() {
  return process.env.VERCEL_ENV === "production" && siteUrl().startsWith("https://");
}

/** Pings IndexNow about these site-relative paths once the response is sent. Failures are only logged. */
export function announce(paths: string[]) {
  if (!enabled() || paths.length === 0) return;
  const base = siteUrl();
  after(async () => {
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(base).host,
          key: INDEXNOW_KEY,
          keyLocation: `${base}${INDEXNOW_KEY_PATH}`,
          urlList: [...new Set(paths)].map((path) => `${base}${path}`),
        }),
      });
      // 200 and 202 both mean accepted.
      if (!res.ok) console.error(`[indexnow] ${res.status} ${await res.text()}`);
    } catch (error) {
      console.error("[indexnow] Couldn't reach IndexNow:", error);
    }
  });
}
