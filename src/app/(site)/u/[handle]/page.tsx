import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { PostGrid } from "@/components/PostCard";
import { FollowButton } from "@/components/Social";
import { getCurrentUser } from "@/lib/auth";
import { getCreator } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { linkLabel } from "@/lib/links";
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
          <div className="mt-2 flex items-center gap-5">
            <Avatar name={creator.name} file={creator.avatarFile} className="h-20 w-20 shrink-0 text-3xl" />
            <h1 className="min-w-0 break-words text-5xl font-light">{creator.name}</h1>
          </div>
          <p className="mt-1 text-muted">
            @{creator.handle} · joined {formatDate(creator.createdAt)}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            <strong className="text-ink">{counts.followers}</strong> {counts.followers === 1 ? "follower" : "followers"} ·{" "}
            <strong className="text-ink">{counts.following}</strong> following
          </p>
          {creator.bio && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{creator.bio}</p>}
          {creator.links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${creator.name} elsewhere`}>
              {creator.links.map((link) => (
                <li key={link}>
                  {/* Links people add themselves: no ranking credit, and the new tab can't reach back. */}
                  <a
                    href={link}
                    target="_blank"
                    rel="nofollow ugc noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    {linkLabel(link)}
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {isSelf && (
            <Link href="/dashboard/profile" className="btn-ghost mt-5 inline-flex px-5 py-2">
              Edit profile
            </Link>
          )}
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
            <dt className="eyebrow">With evidence</dt>
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
