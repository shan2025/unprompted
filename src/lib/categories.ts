import type { Stage } from "./scoring";

export const CATEGORIES = [
  { id: "code", label: "Code", blurb: "Libraries, scripts, tools and snippets" },
  { id: "website", label: "Websites", blurb: "Templates, themes and complete sites" },
  { id: "writing", label: "Writing", blurb: "Essays, stories, guides and scripts" },
  { id: "poetry", label: "Poetry", blurb: "Poems, lyrics and spoken word" },
  { id: "art", label: "Art", blurb: "Illustration, painting and drawing" },
  { id: "photography", label: "Photography", blurb: "Prints, series and stock" },
  { id: "design", label: "Design", blurb: "Logos, type, UI kits and patterns" },
  { id: "music", label: "Music & audio", blurb: "Tracks, stems, samples and scores" },
  { id: "idea", label: "Ideas", blurb: "Concepts, plots, product and business ideas" },
  { id: "other", label: "Other", blurb: "Anything else made by hand" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];

export function isCategory(value: unknown): value is CategoryId {
  return typeof value === "string" && (CATEGORY_IDS as string[]).includes(value);
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? "Other";
}

// How much each stage of the work counts toward the final score. The stage
// that produces the thing the buyer is paying for carries the most weight.
export const STAGE_WEIGHTS: Record<CategoryId, Record<Stage, number>> = {
  code: { ideation: 0.15, creation: 0.55, refinement: 0.15, assets: 0.15 },
  website: { ideation: 0.15, creation: 0.5, refinement: 0.15, assets: 0.2 },
  writing: { ideation: 0.15, creation: 0.6, refinement: 0.15, assets: 0.1 },
  poetry: { ideation: 0.15, creation: 0.65, refinement: 0.15, assets: 0.05 },
  art: { ideation: 0.15, creation: 0.65, refinement: 0.15, assets: 0.05 },
  photography: { ideation: 0.1, creation: 0.6, refinement: 0.25, assets: 0.05 },
  design: { ideation: 0.2, creation: 0.55, refinement: 0.15, assets: 0.1 },
  music: { ideation: 0.15, creation: 0.6, refinement: 0.15, assets: 0.1 },
  idea: { ideation: 0.55, creation: 0.25, refinement: 0.1, assets: 0.1 },
  other: { ideation: 0.2, creation: 0.5, refinement: 0.15, assets: 0.15 },
};

// Categories where an uploaded image is the work itself rather than a cover.
export const VISUAL_CATEGORIES: CategoryId[] = ["art", "photography", "design"];

export const LICENSES = [
  { id: "personal", label: "Personal use", blurb: "Buyer may use it privately." },
  { id: "commercial", label: "Commercial use", blurb: "Buyer may use it in paid work. You keep ownership." },
  {
    id: "exclusive",
    label: "Exclusive transfer",
    blurb: "Sold once. Rights move to the buyer and the listing closes.",
  },
] as const;

export type LicenseId = (typeof LICENSES)[number]["id"];

export function isLicense(value: unknown): value is LicenseId {
  return typeof value === "string" && LICENSES.some((l) => l.id === value);
}

export function licenseLabel(id: string) {
  return LICENSES.find((l) => l.id === id)?.label ?? id;
}
