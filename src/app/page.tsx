import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { ScoreCard } from "@/components/Score";
import { CATEGORIES } from "@/lib/categories";
import { searchListings } from "@/lib/data";
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
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pt-20">
        <div>
          <p className="eyebrow">A market for human work</p>
          <h1 className="mt-4 text-[44px] font-semibold leading-[1.02] sm:text-6xl lg:text-[68px]">
            Made by people.
            <br />
            <em className="font-medium text-accent">Proven,</em> not promised.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            Buy and sell code, writing, art, ideas and anything else people make with their own hands. Every listing shows
            how much AI was involved, as a number with a range and the reasoning behind it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/explore" className="btn-primary px-6 py-3 text-[15px]">
              Explore the market
            </Link>
            <Link href="/sell" className="btn-ghost px-6 py-3 text-[15px]">
              Sell your work
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-3 hidden -rotate-2 rounded-3xl border border-dashed border-line sm:block" aria-hidden="true" />
          <div className="relative">
            <p className="mb-2 text-right text-xs italic text-muted">Example: a short story, lightly copy-edited with AI</p>
            <ScoreCard score={EXAMPLE} evidenceCount={2} />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-display text-sm font-semibold text-accent">{s.n}</span>
              <h2 className="mt-1 text-2xl font-semibold">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Fresh in the market</p>
            <h2 className="mt-1 text-3xl font-semibold">Recently listed</h2>
          </div>
          <Link href="/explore" className="link text-sm font-semibold">
            See everything
          </Link>
        </div>
        <Suspense fallback={<GridSkeleton count={3} />}>
          <Recent />
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <p className="eyebrow">Browse by craft</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/explore?category=${c.id}`}
              className="card group p-4 transition-colors hover:border-ink"
            >
              <span className="font-display text-lg font-semibold group-hover:text-accent">{c.label}</span>
              <span className="mt-1 block text-xs leading-snug text-muted">{c.blurb}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="grid gap-10 rounded-3xl bg-ink p-8 text-paper sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/60">Honest by design</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">A range, not a verdict.</h2>
            <p className="mt-4 max-w-lg leading-relaxed text-paper/80">
              No detector can prove who made something. They get fooled, and they wrongly flag real people. So we never
              call anyone guilty on a scan alone. We show our working, give an honest range, and send disagreements to a
              person, not an algorithm.
            </p>
            <Link href="/standard" className="mt-6 inline-block font-semibold text-paper underline decoration-paper/40 underline-offset-4 hover:decoration-paper">
              Read how scoring works
            </Link>
          </div>
          <ul className="space-y-4 text-sm leading-relaxed text-paper/80">
            <li>
              <strong className="text-paper">Your disclosure is the floor.</strong> We never show less AI than a creator
              admits to.
            </li>
            <li>
              <strong className="text-paper">Scans can only raise a score</strong>, and only as far as their confidence
              allows.
            </li>
            <li>
              <strong className="text-paper">Evidence narrows the range.</strong> Process proof beats any detector.
            </li>
            <li>
              <strong className="text-paper">Disputes go to people.</strong> Flags and disagreements are reviewed by a
              moderator, and creators can respond with evidence.
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
        <Link href="/sell" className="link font-semibold text-ink">
          Be the first.
        </Link>
      </p>
    );
  }
  return <ListingGrid listings={listings} />;
}
