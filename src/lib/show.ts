// What the explore feed shows. Kept apart from feed.ts so the browser can use it.
// Work for sale lives on /marketplace, not here.
export const SHOWS = {
  all: "Everything",
  video: "Videos and films",
} as const;
export type Show = keyof typeof SHOWS;

export function isShow(value: unknown): value is Show {
  return typeof value === "string" && value in SHOWS;
}
