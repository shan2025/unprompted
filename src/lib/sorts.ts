export const SORTS = {
  new: "Newest",
  "least-ai": "Least AI first",
  "price-low": "Price: low to high",
  "price-high": "Price: high to low",
} as const;
export type Sort = keyof typeof SORTS;
