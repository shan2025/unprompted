import "server-only";
import { searchListings, type ListingCard, type ListingFilters } from "./data";
import { searchPosts, type PostCard } from "./journal";
import type { Show } from "./show";

export type FeedItem = { kind: "listing"; listing: ListingCard } | { kind: "post"; post: PostCard };

export interface FeedFilters extends Omit<ListingFilters, "price"> {
  show?: Show;
}

const created = (item: FeedItem) => (item.kind === "listing" ? item.listing.createdAt : item.post.createdAt).getTime();
const aiShare = (item: FeedItem) => (item.kind === "listing" ? item.listing.aiPercent : item.post.aiPercent);

/** Listings and free posts together, as one list. */
export async function searchFeed({ show = "all", ...filters }: FeedFilters) {
  const sort = filters.sort ?? "new";
  const limit = filters.limit ?? 60;
  // Prices only make sense for listings, and videos are only on posts for now.
  const wantListings = show !== "video";
  const wantPosts = show !== "sale" && (sort === "new" || sort === "least-ai");

  const [listings, posts] = await Promise.all([
    wantListings ? searchListings({ ...filters, limit, price: show === "sale" ? "paid" : show === "free" ? "free" : undefined }) : [],
    wantPosts
      ? searchPosts({
          q: filters.q,
          categories: filters.categories,
          maxAi: filters.maxAi,
          verified: filters.verified,
          hasVideo: show === "video",
          sort: sort === "least-ai" ? "least-ai" : "new",
          limit,
        })
      : [],
  ]);

  const items: FeedItem[] = [
    ...listings.map((listing) => ({ kind: "listing" as const, listing })),
    ...posts.map((post) => ({ kind: "post" as const, post })),
  ];
  // Price sorts have listings only, already in order from the database.
  if (sort === "new") items.sort((a, b) => created(b) - created(a));
  if (sort === "least-ai") items.sort((a, b) => aiShare(a) - aiShare(b) || created(b) - created(a));
  return items.slice(0, limit);
}
