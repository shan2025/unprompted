import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, isCategory } from "@/lib/categories";
import { usedCategories } from "@/lib/data";
import { appreciatedPostIds, homeFeed } from "@/lib/home-feed";
import { FeedBar, type FeedTab } from "./FeedBar";
import { FeedPost } from "./FeedPost";

export type HomeFeedParams = { feed?: string; category?: string };

/** The phone home page: a short welcome for visitors, then the feed to scroll. */
export async function HomeFeed({ searchParams }: { searchParams: Promise<HomeFeedParams> }) {
  await connection();
  const params = await searchParams;
  const user = await getCurrentUser();
  const feed: FeedTab = params.feed === "following" && user ? "following" : "foryou";
  const category = isCategory(params.category) ? params.category : undefined;
  const [items, explore, market] = await Promise.all([
    homeFeed(30, { followedBy: feed === "following" ? user?.id : undefined, category }),
    usedCategories("explore"),
    usedCategories("marketplace"),
  ]);
  // Only crafts with something in them, so a chip never leads to an empty feed.
  const crafts = CATEGORIES.filter((c) => explore.includes(c.id) || market.includes(c.id)).map((c) => ({ id: c.id, label: c.label }));
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

      <FeedBar feed={feed} category={category} categories={crafts} signedIn={Boolean(user)} />

      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink-soft">
          {feed === "following" ? (
            <>
              Nothing new from the people you follow{category ? " in this craft" : ""}.{" "}
              <Link href="/explore" className="link text-ink">
                Find people to follow
              </Link>
            </>
          ) : category ? (
            <>
              Nothing here yet.{" "}
              <Link href="/" className="link text-ink">
                See everything
              </Link>
            </>
          ) : (
            <>
              Nothing shared yet.{" "}
              <Link href="/start" className="link text-ink">
                Be the first.
              </Link>
            </>
          )}
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
