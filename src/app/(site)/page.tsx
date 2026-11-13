import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedGrid } from "@/components/FeedGrid";
import { HomeFeed, HomeFeedSkeleton, type HomeFeedParams } from "@/components/HomeFeed";
import { GridSkeleton } from "@/components/ListingCard";
import { Reveal } from "@/components/Reveal";
import { ScoreCard } from "@/components/Score";
import { CATEGORIES } from "@/lib/categories";
import { usedCategories } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { featuredFeed, searchFeed } from "@/lib/feed";
import { followCounts } from "@/lib/journal";
import { computeScore } from "@/lib/scoring";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// A worked example for the hero: a short story with light AI help on the edit.
// The evidence carries links, as real evidence must, so the card shows
// "Evidence attached" rather than counting items that don't score.
const EXAMPLE = computeScore({
  category: "writing",
  disclosure: { ideation: "none", creation: "none", refinement: "light", assets: "none" },
  evidence: [
    { kind: "drafts", url: "https://example.com/drafts" },
    { kind: "version-history", url: "https://example.com/history" },
  ],
  detections: [{ stage: "creation", share: 0.04, confidence: 0.45, source: "builtin-text" }],
});

const STEPS = [
  {
    n: "01",
    title: "Disclose",
    body: "Creators say exactly where AI touched the work: the idea, the making, the polish, the extras. Their answer is the floor of the score.",
  },
  {
    n: "02",
    title: "Analyze",
    body: "We scan the text, code and file metadata for machine patterns, generator tags and Content Credentials. Scans can raise a score, never lower it.",
  },
  {
    n: "03",
    title: "Prove",
    body: "Drafts, time-lapses and commit history narrow the range. They're public, so anyone can see how the work was made.",
  },
];

// Stagger delay for the intro animations in globals.css.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function Home({ searchParams }: { searchParams: Promise<HomeFeedParams> }) {
  return (
    <>
      {/* Phones get a feed to scroll down, like a social app. */}
      <div className="md:hidden">
        <Suspense fallback={<HomeFeedSkeleton />}>
          <HomeFeed searchParams={searchParams} />
        </Suspense>
      </div>
      <div className="hidden md:block">
      <section className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:pt-32">
        <div>
          <p className="eyebrow intro-rise">A place for human work</p>
          <h1 style={d(80)} className="intro-rise mt-6 text-[44px] font-light leading-[1.04] sm:text-6xl lg:text-[76px]">
            Work made by people.
            <br />
            See how it was made.
          </h1>
          <p style={d(220)} className="intro-rise mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
            Explore writing, art, film, code, handicrafts and anything else people make themselves. Each piece shows how
            much AI was involved, as a number with a range and the reasoning behind it. If it&apos;s for sale, you can buy
            it.
          </p>
          <div style={d(340)} className="intro-rise mt-10 flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary px-8 py-4">
              Explore the work
            </Link>
            <Link href="/start" className="btn-ghost px-8 py-4">
              Share or sell yours
            </Link>
          </div>
        </div>
        <div style={d(300)} className="intro-open">
          <p className="mb-3 text-xs text-muted">Example: a short story, lightly copy-edited with AI</p>
          <ScoreCard score={EXAMPLE} evidenceCount={2} intro />
        </div>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <span className="text-sm text-muted">{s.n}</span>
              <h2 className="mt-3 text-3xl font-light">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <Suspense fallback={null}>
        <Featured />
      </Suspense>

      <Suspense fallback={null}>
        <Following />
      </Suspense>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <Reveal className="mb-10 flex items-end justify-between gap-4">
          <h2 className="text-4xl font-light">Recently shared</h2>
          <Link href="/explore" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
            See everything
          </Link>
        </Reveal>
        <Suspense fallback={<GridSkeleton count={6} />}>
          <Recent />
        </Suspense>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <Reveal>
          <h2 className="text-4xl font-light">Browse by craft</h2>
        </Reveal>
        <Suspense fallback={<div className="mt-10 h-48 animate-pulse border border-line" />}>
          <Crafts />
        </Suspense>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <Reveal className="grid gap-12 bg-ink p-10 text-white sm:p-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Honest by design</p>
            <h2 className="mt-4 text-4xl font-light sm:text-5xl">A range, not a verdict.</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-white/75">
              No detector can prove who made something. They get fooled, and they wrongly flag real people. So we never
              call anyone guilty on a scan alone. We show our working, give an honest range, and send disagreements to a
              person, not an algorithm.
            </p>
            <Link href="/standard" className="btn mt-8 bg-white px-8 py-4 text-ink hover:bg-white/85">
              How scoring works
            </Link>
          </div>
          <ul className="space-y-5 text-sm leading-relaxed text-white/75">
            <li>
              <strong className="font-medium text-white">Your disclosure is the floor.</strong> We never show less AI than a
              creator admits to.
            </li>
            <li>
              <strong className="font-medium text-white">Scans can only raise a score</strong>, and only as far as their
              confidence allows.
            </li>
            <li>
              <strong className="font-medium text-white">Evidence narrows the range.</strong> Process proof beats any
              detector.
            </li>
            <li>
              <strong className="font-medium text-white">Disputes go to people.</strong> Flags and disagreements are
              reviewed by a moderator, and creators can respond with evidence.
            </li>
          </ul>
        </Reveal>
      </section>
      </div>
    </>
  );
}

// Only crafts with something in them. Each links to Explore when it has free
// work there, and to the marketplace when everything in it is for sale.
async function Crafts() {
  await connection();
  const [explore, market] = await Promise.all([usedCategories("explore"), usedCategories("marketplace")]);
  const crafts = CATEGORIES.filter((c) => explore.includes(c.id) || market.includes(c.id));
  if (crafts.length === 0) return <p className="mt-6 text-ink-soft">Nothing shared yet.</p>;
  return (
    <div className="mt-10 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-4">
      {crafts.map((c, i) => (
        <Reveal key={c.id} delay={(i % 4) * 70} className="grid border-b border-r border-line">
          <Link
            href={`/${explore.includes(c.id) ? "explore" : "marketplace"}?category=${c.id}`}
            className="group p-6 transition-colors hover:bg-field"
          >
            <span className="text-lg">{c.label}</span>
            <span className="mt-1 block text-xs leading-snug text-muted">{c.blurb}</span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

// Work a moderator picked from /admin. Hidden until something is featured.
async function Featured() {
  await connection();
  const items = await featuredFeed(6);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
      <Reveal className="mb-10">
        <p className="eyebrow">Picked by us</p>
        <h2 className="mt-2 text-4xl font-light">Featured</h2>
      </Reveal>
      <FeedGrid items={items} reveal />
    </section>
  );
}

// Signed-in people see new work from creators they follow, including work for
// sale. Signed-out visitors see nothing here, so the page reads as before.
async function Following() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [items, { following }] = await Promise.all([
    searchFeed({ followedBy: user.id, sort: "new", limit: 6 }),
    followCounts(user.id),
  ]);
  return (
    <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
      <Reveal className="mb-10 flex items-end justify-between gap-4">
        <h2 className="text-4xl font-light">From people you follow</h2>
        {items.length > 0 && (
          <Link href="/journal?tab=following" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
            More writing
          </Link>
        )}
      </Reveal>
      {items.length > 0 ? (
        <FeedGrid items={items} reveal />
      ) : (
        <p className="card p-8 text-center text-ink-soft">
          {following === 0
            ? "You're not following anyone yet. Follow creators from their work or profile and their new pieces show up here. "
            : "Nothing new from the people you follow yet. "}
          <Link href="/explore" className="link text-ink">
            Explore the work
          </Link>
        </p>
      )}
    </section>
  );
}

async function Recent() {
  await connection();
  const items = await searchFeed({ sort: "new", limit: 9 });
  if (items.length === 0) {
    return (
      <p className="card p-8 text-center text-ink-soft">
        Nothing shared yet.{" "}
        <Link href="/start" className="link text-ink">
          Be the first.
        </Link>
      </p>
    );
  }
  return <FeedGrid items={items} reveal />;
}
