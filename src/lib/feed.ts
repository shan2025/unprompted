import "server-only";
import { searchListings, type ListingCard, type ListingFilters } from "./data";
import { searchPosts, type PostCard } from "./journal";
import type { Show } from "./show";
import type { ExploreSort } from "./sorts";

export type FeedItem = { kind: "listing"; listing: ListingCard } | { kind: "post"; post: PostCard };

export interface FeedFilters extends Omit<ListingFilters, "price" | "sort"> {
  show?: Show;
  sort?: ExploreSort;
}

const created = (item: FeedItem) => (item.kind === "listing" ? item.listing.createdAt : item.post.createdAt).getTime();
const aiShare = (item: FeedItem) => (item.kind === "listing" ? item.listing.aiPercent : item.post.aiPercent);

/**
 * Free listings and posts together, as one list. Work for sale is on the
 * marketplace instead, so it never shows up here.
 */
export async function searchFeed({ show = "all", ...filters }: FeedFilters) {
  const sort = filters.sort ?? "new";
  const limit = filters.limit ?? 60;
  // Videos are only on posts for now.
  const wantListings = show !== "video";

  const [listings, posts] = await Promise.all([
    wantListings ? searchListings({ ...filters, sort, limit, price: "free" }) : [],
    searchPosts({
      q: filters.q,
      categories: filters.categories,
      maxAi: filters.maxAi,
      verified: filters.verified,
      hasVideo: show === "video",
      sort,
      limit,
    }),
  ]);

  const items: FeedItem[] = [
    ...listings.map((listing) => ({ kind: "listing" as const, listing })),
    ...posts.map((post) => ({ kind: "post" as const, post })),
  ];
  if (sort === "new") items.sort((a, b) => created(b) - created(a));
  if (sort === "least-ai") items.sort((a, b) => aiShare(a) - aiShare(b) || created(b) - created(a));
  return items.slice(0, limit);
}
