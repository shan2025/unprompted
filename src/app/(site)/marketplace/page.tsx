import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ExploreView } from "@/components/ExploreView";
import { FeedGrid } from "@/components/FeedGrid";
import { GridSkeleton } from "@/components/ListingCard";
import { CATEGORY_IDS, type CategoryId } from "@/lib/categories";
import { searchListings, usedCategories } from "@/lib/data";
import { plural } from "@/lib/format";
import { SORTS, type Sort } from "@/lib/sorts";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Buy writing, art, film, code, handicrafts and more, made by people. Every piece shows how much AI was involved.",
  alternates: { canonical: "/marketplace" },
};

type Params = Record<string, string | string[] | undefined>;

export default function MarketplacePage({ searchParams }: { searchParams: Promise<Params> }) {
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
  return picked.length === CATEGORY_IDS.length ? [] : picked;
}

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params.q)?.trim().slice(0, 100) ?? "";
  const categories = parseCategories(params.category);
  const maxAiRaw = one(params.maxAi) ?? "";
  const maxAi = ["5", "20", "50"].includes(maxAiRaw) ? Number(maxAiRaw) : undefined;
  const sortRaw = one(params.sort) ?? "new";
  const sort: Sort = sortRaw in SORTS ? (sortRaw as Sort) : "new";
  const verified = one(params.verified) === "1";

  const [listings, available] = await Promise.all([
    searchListings({ q, categories, maxAi, sort, verified, price: "paid" }),
    usedCategories("marketplace"),
  ]);
  const items = listings.map((listing) => ({ kind: "listing" as const, listing }));

  return (
    <ExploreView page="marketplace" available={available} filters={{ categories }} fields={{ q, maxAi: maxAi?.toString() ?? "", sort, verified, show: "all" }}>
      <p className="mb-4 text-sm text-muted">{items.length === 0 ? "Nothing matches." : plural(items.length, "piece") + " for sale"}</p>
      {items.length > 0 ? (
        <FeedGrid items={items} />
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-medium">Nothing for sale here yet.</p>
          <p className="mt-2 text-ink-soft">
            Try loosening the filters, or{" "}
            <Link href="/sell" className="link font-semibold text-ink">
              list something you made
            </Link>
            .
          </p>
        </div>
      )}
    </ExploreView>
  );
}
