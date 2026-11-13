/** Reads "/journal/slug", "/listing/slug" or a full link to either, as a moderator pastes it. */
export function parseWorkLink(input: string): { kind: "post" | "listing"; slug: string } | null {
  const path = input.trim().replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
  const m = path.match(/^\/?(journal|listing)\/([a-z0-9-]+)\/?$/i);
  if (!m || m[2].toLowerCase() === "new") return null;
  return { kind: m[1].toLowerCase() === "journal" ? "post" : "listing", slug: m[2].toLowerCase() };
}
