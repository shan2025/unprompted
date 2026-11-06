import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExploreView } from "@/components/ExploreView";
import { FeedGrid } from "@/components/FeedGrid";
import { GridSkeleton } from "@/components/ListingCard";
import { CATEGORY_IDS, type CategoryId } from "@/lib/categories";
import { usedCategories } from "@/lib/data";
import { searchFeed } from "@/lib/feed";
import { plural } from "@/lib/format";
import { isShow, type Show } from "@/lib/show";
import { EXPLORE_SORTS, type ExploreSort } from "@/lib/sorts";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Explore",
  description: "Read and watch writing, art, film, code, handicrafts and more, made by people. Every piece shows how much AI was involved.",
  alternates: { canonical: "/explore" },
};

type Params = Record<string, string | string[] | undefined>;

export default function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<GridSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

// Categories arrive as a comma-separated list: ?category=writing,poetry
function parseCategories(v: string | string[] | undefined): CategoryId[] {
  const ids = (Array.isArray(v) ? v : [v ?? ""]).flatMap((s) => s.split(","));
  const picked = CATEGORY_IDS.filter((id) => ids.includes(id));
  // Every category picked is the same as no filter.
  return picked.length === CATEGORY_IDS.length ? [] : picked;
}

function marketplaceHref(params: Params) {
  const qs = new URLSearchParams();
  for (const key of ["q", "category", "maxAi", "sort", "verified"]) {
    const v = one(params[key]);
    if (v) qs.set(key, v);
  }
  const query = qs.toString();
  return query ? `/marketplace?${query}` : "/marketplace";
}

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params.q)?.trim().slice(0, 100) ?? "";
  const categories = parseCategories(params.category);
  const maxAiRaw = one(params.maxAi) ?? "";
  const maxAi = ["5", "20", "50"].includes(maxAiRaw) ? Number(maxAiRaw) : undefined;
  const sortRaw = one(params.sort) ?? "new";
  const sort: ExploreSort = sortRaw in EXPLORE_SORTS ? (sortRaw as ExploreSort) : "new";
  const verified = one(params.verified) === "1";
  const showRaw = one(params.show);
  // Old links asked for ?show=sale here; that work now lives on the marketplace.
  if (showRaw === "sale") redirect(marketplaceHref(params));
  const show: Show = isShow(showRaw) ? showRaw : "all";

  const [items, available] = await Promise.all([
    searchFeed({ q, categories, maxAi, sort, verified, show }),
    usedCategories("explore"),
  ]);

  return (
    <ExploreView available={available} filters={{ categories }} fields={{ q, maxAi: maxAi?.toString() ?? "", sort, verified, show }}>
      <p className="mb-4 text-sm text-muted">
        {/* The empty state below says it when nothing matches. */}
        {items.length > 0 && `${plural(items.length, "work")} · `}
        <Link href="/marketplace" className="link text-ink">
          Looking to buy? See the marketplace
        </Link>
      </p>
      {items.length > 0 ? (
        <FeedGrid items={items} />
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-medium">Nothing here yet.</p>
          <p className="mt-2 text-ink-soft">
            Try loosening the filters, or{" "}
            <Link href="/journal/new" className="link font-semibold text-ink">
              share something of your own
            </Link>
            .
          </p>
        </div>
      )}
    </ExploreView>
  );
}
