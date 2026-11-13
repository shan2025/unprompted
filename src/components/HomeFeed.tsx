import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appreciatedPostIds, homeFeed } from "@/lib/home-feed";
import { FeedPost } from "./FeedPost";

/** The phone home page: a short welcome for visitors, then the feed to scroll. */
export async function HomeFeed() {
  await connection();
  const [user, items] = await Promise.all([getCurrentUser(), homeFeed(30)]);
  const liked = user
    ? await appreciatedPostIds(
        user.id,
        items.flatMap((i) => (i.kind === "post" ? [i.post.id] : [])),
      )
    : new Set<number>();

  return (
    <div className="mx-auto max-w-xl">
      {!user && (
        <section className="border-b border-line px-4 py-5">
          <h1 className="text-2xl font-light leading-tight">Work made by people. See how it was made.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Watch, read and buy writing, art, film, code and crafts. Every piece shows how much AI was involved.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/start" className="btn-primary px-5 py-2.5">
              Get started
            </Link>
            <Link href="/standard" className="btn-ghost px-5 py-2.5">
              How scoring works
            </Link>
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink-soft">
          Nothing shared yet.{" "}
          <Link href="/start" className="link text-ink">
            Be the first.
          </Link>
        </p>
      ) : (
        <>
          {items.map((item) => (
            <FeedPost
              key={item.kind === "listing" ? `l-${item.listing.id}` : `p-${item.post.id}`}
              item={item}
              liked={item.kind === "post" && liked.has(item.post.id)}
            />
          ))}
          <p className="px-4 py-10 text-center text-sm text-ink-soft">
            You&apos;re all caught up.{" "}
            <Link href="/explore" className="link text-ink">
              Explore more
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export function HomeFeedSkeleton() {
  return (
    <div className="mx-auto max-w-xl" aria-busy="true" aria-label="Loading feed">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="border-b border-line pb-4">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-line/70" />
            <div className="h-3 w-28 animate-pulse rounded bg-line/70" />
          </div>
          <div className="aspect-[4/5] animate-pulse bg-line/50" />
          <div className="space-y-2 px-4 pt-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-line/70" />
            <div className="h-3 w-full animate-pulse rounded bg-line/50" />
          </div>
        </div>
      ))}
    </div>
  );
}
