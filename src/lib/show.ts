// What the explore feed shows. Kept apart from feed.ts so the browser can use it.
export const SHOWS = {
  all: "Everything",
  video: "Videos and films",
  free: "Free to enjoy",
  sale: "For sale",
} as const;
export type Show = keyof typeof SHOWS;

export function isShow(value: unknown): value is Show {
  return typeof value === "string" && value in SHOWS;
}
