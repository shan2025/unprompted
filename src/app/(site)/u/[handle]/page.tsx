import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { PostGrid } from "@/components/PostCard";
import { FollowButton } from "@/components/Social";
import { getCurrentUser } from "@/lib/auth";
import { getCreator } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { followCounts, isFollowing, searchPosts } from "@/lib/journal";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default function CreatorPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<GridSkeleton />}>
        <Creator params={params} />
      </Suspense>
    </div>
  );
}

async function Creator({ params }: Props) {
  const { handle } = await params;
  const data = await getCreator(handle.toLowerCase());
  if (!data) notFound();
  const { creator, listings, stats } = data;

  const user = await getCurrentUser();
  const isSelf = user?.id === creator.id;
  const [posts, counts, following] = await Promise.all([
    searchPosts({ authorId: creator.id }),
    followCounts(creator.id),
    user && !isSelf ? isFollowing(user.id, creator.id) : Promise.resolve(false),
  ]);

  return (
    <>
      <div className="grid gap-8 border-b border-line pb-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="eyebrow">Creator</p>
          <h1 className="mt-1 text-5xl font-light">{creator.name}</h1>
          <p className="mt-1 text-muted">
            @{creator.handle} · joined {formatDate(creator.createdAt)}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            <strong className="text-ink">{counts.followers}</strong> {counts.followers === 1 ? "follower" : "followers"} ·{" "}
            <strong className="text-ink">{counts.following}</strong> following
          </p>
          {creator.bio && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{creator.bio}</p>}
          {!isSelf && (
            <div className="mt-5">
              <FollowButton handle={creator.handle} following={following} returnTo={`/u/${creator.handle}`} />
            </div>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-6 text-center md:text-right">
          <div>
            <dt className="eyebrow">Avg. AI</dt>
            <dd className="font-display text-3xl font-light">{stats.avgAi === null ? "–" : `${stats.avgAi}%`}</dd>
          </div>
          <div>
            <dt className="eyebrow">Verified</dt>
            <dd className="font-display text-3xl font-light">{stats.verified}</dd>
          </div>
          <div>
            <dt className="eyebrow">Sales</dt>
            <dd className="font-display text-3xl font-light">{stats.sales}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-normal">For sale</h2>
        <div className="mt-4">
          {listings.length ? <ListingGrid listings={listings} /> : <p className="text-ink-soft">No public listings yet.</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-normal">Journal</h2>
        <div className="mt-4">
          {posts.length ? (
            <PostGrid posts={posts} />
          ) : (
            <p className="text-ink-soft">
              No posts yet.
              {isSelf && (
                <>
                  {" "}
                  <Link href="/journal/new" className="link font-semibold text-ink">
                    Write your first one
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
