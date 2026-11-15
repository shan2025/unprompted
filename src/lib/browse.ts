// Each craft has its own page on Explore and the marketplace (/explore/crafts),
// so search engines and AI tools can find, say, handmade pottery directly.
// Picking more than one craft falls back to a filter: /explore?category=art,design.

import { CATEGORIES, isCategory, type CategoryId } from "./categories";

export type BrowsePage = "explore" | "marketplace";

// How each craft reads in a sentence: "Buy handicrafts made by people".
const NOUNS: Record<CategoryId, string> = {
  code: "code",
  website: "websites",
  writing: "writing",
  poetry: "poetry",
  art: "art",
  photography: "photography",
  design: "design",
  music: "music and audio",
  film: "films and video",
  crafts: "handicrafts",
  idea: "ideas",
  other: "other work",
};

/** The address for one craft on a page, or the page itself with no craft. */
export function browseHref(page: BrowsePage, category?: CategoryId | null) {
  return category ? `/${page}/${category}` : `/${page}`;
}

/** The address for a set of filters: one craft gets its own page, several become a filter. */
export function browseQueryHref(page: BrowsePage, categories: CategoryId[], query: URLSearchParams) {
  const qs = new URLSearchParams(query);
  qs.delete("category");
  if (categories.length > 1) qs.set("category", categories.join(","));
  const path = browseHref(page, categories.length === 1 ? categories[0] : null);
  const rest = qs.toString();
  return rest ? `${path}?${rest}` : path;
}

/** The single craft a ?category= value names, if it names exactly one. */
export function singleCategory(value: string | string[] | undefined): CategoryId | null {
  const ids = (Array.isArray(value) ? value : [value ?? ""]).flatMap((s) => s.split(",")).filter(Boolean);
  return ids.length === 1 && isCategory(ids[0]) ? ids[0] : null;
}

export function categoryHeading(page: BrowsePage, category: CategoryId) {
  const noun = NOUNS[category];
  const title = page === "marketplace" ? `Buy ${noun} made by people` : `${noun[0].toUpperCase()}${noun.slice(1)} made by people`;
  // "Anything else people make, made by people" would repeat itself.
  const blurb = category === "other" ? "Work that fits none of the other crafts" : (CATEGORIES.find((c) => c.id === category)?.blurb ?? "");
  const intro =
    page === "marketplace"
      ? `${blurb}, for sale by the people who made them. Each shows how much AI was involved.`
      : `${blurb}, made by people. Each piece shows how much AI was involved.`;
  return { title, intro, noun };
}
