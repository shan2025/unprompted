import { Fragment } from "react";
import type { FeedItem } from "@/lib/feed";
import { ListingCard } from "./ListingCard";
import { PostCard } from "./PostCard";

// `reveal` staggers each card in as it scrolls into view (needs <RevealOnScroll />).
export function FeedGrid({ items, reveal = false }: { items: FeedItem[]; reveal?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => {
        const card =
          item.kind === "listing" ? <ListingCard listing={item.listing} /> : <PostCard post={item.post} />;
        const key = item.kind === "listing" ? `listing-${item.listing.id}` : `post-${item.post.id}`;
        return reveal ? (
          <div key={key} className="reveal grid" style={{ "--d": `${(i % 3) * 90}ms` } as React.CSSProperties}>
            {card}
          </div>
        ) : (
          <Fragment key={key}>{card}</Fragment>
        );
      })}
    </div>
  );
}
