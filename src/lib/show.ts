import type { CategoryId } from "./categories";

// What the explore feed shows. Kept apart from feed.ts so the browser can use it.
// Work for sale lives on /marketplace, not here.
// Each kind of work is a group of categories, except videos, which are posts
// with a video attached, whatever their category.
export const SHOWS = {
  all: "Everything",
  pictures: "Pictures",
  reading: "Reading",
  video: "Videos and films",
  audio: "Music and audio",
  code: "Code and websites",
} as const;
export type Show = keyof typeof SHOWS;

export const SHOW_CATEGORIES: Partial<Record<Show, CategoryId[]>> = {
  pictures: ["art", "photography", "design", "crafts"],
  reading: ["writing", "poetry", "idea"],
  audio: ["music"],
  code: ["code", "website"],
};

export function isShow(value: unknown): value is Show {
  return typeof value === "string" && value in SHOWS;
}
