import { Fragment } from "react";
import type { FeedItem } from "@/lib/feed";
import { ListingCard } from "./ListingCard";
import { Reveal } from "./Reveal";
import { PostCard } from "./PostCard";

// `reveal` staggers each card in as it scrolls into view.
export function FeedGrid({ items, reveal = false }: { items: FeedItem[]; reveal?: boolean }) {
  return (
    <div className="grid gap-3 max-sm:-mx-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {items.map((item, i) => {
        const card =
          item.kind === "listing" ? <ListingCard listing={item.listing} /> : <PostCard post={item.post} />;
        const key = item.kind === "listing" ? `listing-${item.listing.id}` : `post-${item.post.id}`;
        return reveal ? (
          <Reveal key={key} delay={(i % 3) * 90} className="grid">
            {card}
          </Reveal>
        ) : (
          <Fragment key={key}>{card}</Fragment>
        );
      })}
    </div>
  );
}
