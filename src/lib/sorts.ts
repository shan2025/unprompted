export const SORTS = {
  new: "Newest",
  "least-ai": "Least AI first",
  "price-low": "Price: low to high",
  "price-high": "Price: high to low",
} as const;
export type Sort = keyof typeof SORTS;

/** Explore has nothing with a price, so it only sorts by time and AI share. */
export const EXPLORE_SORTS = { new: SORTS.new, "least-ai": SORTS["least-ai"] } as const;
export type ExploreSort = keyof typeof EXPLORE_SORTS;
