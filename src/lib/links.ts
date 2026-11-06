// Links to a person's other profiles and sites, shown on their Unprompters
// profile. Kept free of server code so the edit form can use it too.

export const MAX_LINKS = 5;
const MAX_LINK_LENGTH = 300;

/**
 * Turn what someone typed into a clean https link, or null if it isn't one.
 * "instagram.com/me" becomes "https://instagram.com/me".
 */
export function normalizeLink(raw: string): string | null {
  const text = raw.trim();
  if (!text || text.length > MAX_LINK_LENGTH) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // A real host has a dot in it: "instagram" alone is a typo, not a site.
    if (!url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const SITES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)threads\.(net|com)$/, "Threads"],
  [/(^|\.)bsky\.app$/, "Bluesky"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)vimeo\.com$/, "Vimeo"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)behance\.net$/, "Behance"],
  [/(^|\.)dribbble\.com$/, "Dribbble"],
  [/(^|\.)facebook\.com$/, "Facebook"],
  [/(^|\.)substack\.com$/, "Substack"],
  [/(^|\.)medium\.com$/, "Medium"],
  [/(^|\.)soundcloud\.com$/, "SoundCloud"],
  [/(^|\.)spotify\.com$/, "Spotify"],
  [/(^|\.)etsy\.com$/, "Etsy"],
  [/(^|\.)pinterest\.com$/, "Pinterest"],
];

/** A short name for a link: "Instagram", or the site's address for anything else. */
export function linkLabel(link: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return SITES.find(([pattern]) => pattern.test(host))?.[1] ?? host;
  } catch {
    return link;
  }
}
