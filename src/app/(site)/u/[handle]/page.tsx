import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { CopyLink } from "@/components/CopyLink";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { PostCard } from "@/components/PostCard";
import { SiteIcon } from "@/components/SiteIcon";
import { FollowButton } from "@/components/Social";
import { getCurrentUser } from "@/lib/auth";
import { getCreator } from "@/lib/data";
import { formatDate, siteUrl } from "@/lib/format";
import { linkLabel, siteName } from "@/lib/links";
import { followCounts, isFollowing, searchPosts } from "@/lib/journal";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default function CreatorPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
      <Suspense fallback={<GridSkeleton />}>
        <Creator params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Creator({ params, searchParams }: Props) {
  const [{ handle }, { tab }] = await Promise.all([params, searchParams]);
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
  // Plenty of people are here to look, not to make. Their profile shows the
  // person, without empty work stats or a "for sale" shelf.
  const sells = listings.length > 0;
  const shares = posts.length > 0;
  const makes = sells || shares;
  const profileUrl = `${siteUrl()}/u/${creator.handle}`;

  // Average AI use across everything they've put up. Videos aren't scanned, so they don't count.
  const scored = [...posts.filter((p) => !p.videoUrl).map((p) => p.aiPercent), ...listings.map((l) => l.aiPercent)];
  const avgAi = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
  const withEvidence = posts.filter((p) => p.processVerified).length + stats.verified;

  // With both kinds of work, each gets a tab. With one kind, it's a plain heading.
  const both = sells && shares;
  const showing = both ? (tab === "for-sale" ? "for-sale" : "journal") : sells ? "for-sale" : "journal";
  const tabs = [
    { key: "journal", label: "Journal", n: posts.length, has: shares },
    { key: "for-sale", label: "For sale", n: listings.length, has: sells },
  ];

  return (
    <>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-6 sm:gap-x-8 md:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Avatar name={creator.name} file={creator.avatarFile} className="h-20 w-20 text-3xl sm:h-28 sm:w-28 sm:text-4xl" />
        <div className="min-w-0">
          <h1 className="break-words text-4xl font-light leading-tight sm:text-5xl">{creator.name}</h1>
          <p className="mt-1.5 text-muted">
            @{creator.handle} · Joined {formatDate(creator.createdAt)}
          </p>
          {creator.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-ink-soft">{creator.bio}</p>}
          {creator.links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${creator.name} elsewhere`}>
              {creator.links.map((link) => (
                <li key={link}>
                  {/* Links people add themselves: no ranking credit, and the new tab can't reach back. */}
                  <a
                    href={link}
                    target="_blank"
                    rel="nofollow ugc noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line py-1.5 pl-3 pr-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    <SiteIcon site={siteName(link)} className="h-4 w-4" />
                    {linkLabel(link)}
                    <span aria-hidden="true" className="text-muted">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="col-span-2 flex items-start gap-2.5 md:col-span-1 md:pt-2">
          {isSelf ? (
            <Link href="/dashboard/profile" className="btn-ghost px-5 py-2.5">
              Edit profile
            </Link>
          ) : (
            <FollowButton handle={creator.handle} following={following} returnTo={`/u/${creator.handle}`} />
          )}
          <CopyLink url={profileUrl} label="Copy profile link" icon className="btn-ghost h-[42px] w-[42px] p-0" />
        </div>
      </div>

      <dl className="mt-10 grid grid-cols-3 border-y border-line sm:flex sm:flex-wrap">
        {makes && <Stat label="Works" value={posts.length + listings.length} />}
        <Stat label={counts.followers === 1 ? "Follower" : "Followers"} value={counts.followers} />
        <Stat label="Following" value={counts.following} />
        {avgAi !== null && <Stat label="Avg. AI use" value={`${avgAi}%`} tone="text-human" />}
        {makes && <Stat label="With process evidence" value={withEvidence} />}
        {sells && <Stat label={stats.sales === 1 ? "Sale" : "Sales"} value={stats.sales} />}
      </dl>

      {makes && (
        <section className="mt-10">
          <div className="flex items-center gap-7 border-b border-line">
            {tabs
              .filter((t) => t.has)
              .map(({ key, label, n }) =>
                both ? (
                  <Link
                    key={key}
                    href={key === "journal" ? `/u/${creator.handle}` : `/u/${creator.handle}?tab=for-sale`}
                    scroll={false}
                    aria-current={showing === key ? "page" : undefined}
                    className={`-mb-px inline-flex items-center gap-2 border-b-2 pb-3 text-lg ${showing === key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
                  >
                    {label} <Count n={n} />
                  </Link>
                ) : (
                  <h2 key={key} className="-mb-px inline-flex items-center gap-2 border-b-2 border-ink pb-3 text-lg font-normal">
                    {label} <Count n={n} />
                  </h2>
                ),
              )}
          </div>
          <div className="mt-6">
            {showing === "for-sale" ? (
              <ListingGrid listings={listings} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} ownerReturnTo={isSelf ? `/u/${creator.handle}` : undefined} />
                ))}
                {isSelf && <ShareSlot />}
              </div>
            )}
          </div>
        </section>
      )}

      {!makes && (
        <div className="mt-10">
          {isSelf ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <ShareSlot first />
            </div>
          ) : (
            <p className="text-ink-soft">{creator.name.split(" ")[0]} hasn&apos;t shared any work yet.</p>
          )}
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: number | string; tone?: string }) {
  return (
    // The number reads first, but the label comes first for screen readers, as a list needs.
    <div className="flex flex-col-reverse justify-end py-4 pr-4 sm:mr-8 sm:border-r sm:border-line sm:pr-8 sm:last:mr-0 sm:last:border-r-0">
      <dt className="mt-0.5 text-[13px] text-muted">{label}</dt>
      <dd className={`text-2xl font-light tabular-nums sm:text-[28px] ${tone}`}>{value}</dd>
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-field px-2 text-[13px] font-semibold text-ink-soft">{n}</span>;
}

/** Only on your own profile: an open slot in the grid that leads to sharing something. */
function ShareSlot({ first = false }: { first?: boolean }) {
  return (
    <Link
      href="/journal/new"
      className="group flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed border-[#c9c9c9] p-8 text-center transition-colors hover:border-ink hover:bg-[#fafafa]"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-ink-soft text-ink-soft group-hover:border-ink group-hover:text-ink">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="text-lg font-medium">{first ? "Share your first work" : "Share new work"}</span>
      <span className="max-w-[26ch] text-sm leading-relaxed text-muted">Writing, video, craft or code. Show how you made it.</span>
    </Link>
  );
}
