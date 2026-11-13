import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { searchListings } from "./data";
import { db, schema } from "./db";
import type { FeedItem } from "./feed";
import { searchPosts } from "./journal";

const created = (item: FeedItem) => (item.kind === "listing" ? item.listing.createdAt : item.post.createdAt).getTime();

/**
 * The phone home feed: everything new, posts and listings together, including
 * work for sale, newest first. Unlike Explore it mixes in the marketplace,
 * so people can buy straight from what they're scrolling.
 */
export async function homeFeed(limit = 30, { followedBy, category }: { followedBy?: number; category?: string } = {}) {
  const categories = category ? [category] : undefined;
  const [listings, posts] = await Promise.all([
    searchListings({ sort: "new", limit, followedBy, categories }),
    searchPosts({ sort: "new", limit, followedBy, categories }),
  ]);
  const items: FeedItem[] = [
    ...listings.map((listing) => ({ kind: "listing" as const, listing })),
    ...posts.map((post) => ({ kind: "post" as const, post })),
  ];
  return items.sort((a, b) => created(b) - created(a)).slice(0, limit);
}

/** Which of these posts the viewer has appreciated, so the feed's hearts start filled in. */
export async function appreciatedPostIds(viewerId: number, postIds: number[]) {
  if (postIds.length === 0) return new Set<number>();
  const rows = await db
    .select({ postId: schema.postAppreciations.postId })
    .from(schema.postAppreciations)
    .where(and(eq(schema.postAppreciations.userId, viewerId), inArray(schema.postAppreciations.postId, postIds)));
  return new Set(rows.map((r) => r.postId));
}
