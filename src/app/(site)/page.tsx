import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { PostGrid, PostGridSkeleton } from "@/components/PostCard";
import { ScoreCard } from "@/components/Score";
import { CATEGORIES } from "@/lib/categories";
import { searchListings } from "@/lib/data";
import { searchPosts } from "@/lib/journal";
import { computeScore } from "@/lib/scoring";

// A worked example for the hero: a short story with light AI help on the edit.
const EXAMPLE = computeScore({
  category: "writing",
  disclosure: { ideation: "none", creation: "none", refinement: "light", assets: "none" },
  evidence: [{ kind: "drafts" }, { kind: "version-history" }],
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
    body: "Drafts, time-lapses and commit history narrow the range. They're public, so buyers can check the receipts themselves.",
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:pt-32">
        <div>
          <p className="eyebrow">A market for human work</p>
          <h1 className="mt-6 text-[44px] font-light leading-[1.04] sm:text-6xl lg:text-[76px]">
            Made by people.
            <br />
            Proven, not promised.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
            Buy and sell code, writing, art, ideas and anything else people make themselves. Every listing shows how much
            AI was involved, as a number with a range and the reasoning behind it.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/start" className="btn-primary px-8 py-4">
              Get started
            </Link>
            <Link href="/explore" className="btn-ghost px-8 py-4">
              Explore the market
            </Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs text-muted">Example: a short story, lightly copy-edited with AI</p>
          <ScoreCard score={EXAMPLE} evidenceCount={2} />
        </div>
      </section>

      <section className="border-y border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="text-sm text-muted">{s.n}</span>
              <h2 className="mt-3 text-3xl font-light">{s.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="text-4xl font-light">Recently listed</h2>
          <Link href="/explore" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
            See everything
          </Link>
        </div>
        <Suspense fallback={<GridSkeleton count={3} />}>
          <Recent />
        </Suspense>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-light">From the Journal</h2>
            <p className="mt-2 text-ink-soft">Articles, poems and process notes, shared for free.</p>
          </div>
          <Link href="/journal" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
            Read more
          </Link>
        </div>
        <Suspense fallback={<PostGridSkeleton count={3} />}>
          <RecentPosts />
        </Suspense>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <h2 className="text-4xl font-light">Browse by craft</h2>
        <div className="mt-10 grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/explore?category=${c.id}`}
              className="group border-b border-r border-line p-6 transition-colors hover:bg-field"
            >
              <span className="text-lg">{c.label}</span>
              <span className="mt-1 block text-xs leading-snug text-muted">{c.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-8">
        <div className="grid gap-12 bg-ink p-10 text-white sm:p-16 lg:grid-cols-[1.2fr_1fr]">
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
        </div>
      </section>
    </>
  );
}

async function Recent() {
  await connection();
  const listings = await searchListings({ sort: "new", limit: 6 });
  if (listings.length === 0) {
    return (
      <p className="card p-8 text-center text-ink-soft">
        Nothing listed yet.{" "}
        <Link href="/start" className="link text-ink">
          Be the first.
        </Link>
      </p>
    );
  }
  return <ListingGrid listings={listings} />;
}

async function RecentPosts() {
  await connection();
  const posts = await searchPosts({ limit: 3 });
  if (posts.length === 0) {
    return (
      <p className="card p-8 text-center text-ink-soft">
        No posts yet.{" "}
        <Link href="/journal/new" className="link text-ink">
          Write the first one.
        </Link>
      </p>
    );
  }
  return <PostGrid posts={posts} />;
}
