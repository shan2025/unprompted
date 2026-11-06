import type { FeedItem } from "@/lib/feed";
import { ListingCard } from "./ListingCard";
import { PostCard } from "./PostCard";

export function FeedGrid({ items }: { items: FeedItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) =>
        item.kind === "listing" ? <ListingCard key={`listing-${item.listing.id}`} listing={item.listing} /> : <PostCard key={`post-${item.post.id}`} post={item.post} />,
      )}
    </div>
  );
}
