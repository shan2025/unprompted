import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { ExploreView } from "@/components/ExploreView";
import { CATEGORY_IDS, type CategoryId } from "@/lib/categories";
import { searchListings } from "@/lib/data";
import { SORTS, type Sort } from "@/lib/sorts";

export const metadata: Metadata = { title: "Explore" };

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
  return CATEGORY_IDS.filter((id) => ids.includes(id));
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
  const more = one(params.more) === "1";

  const listings = await searchListings({ q, categories, maxAi, sort, verified });

  return (
    <ExploreView filters={{ categories, more }} fields={{ q, maxAi: maxAi?.toString() ?? "", sort, verified }}>
      <p className="mb-4 text-sm text-muted">
        {listings.length === 0 ? "No listings match." : `${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
      </p>
      {listings.length > 0 ? (
        <ListingGrid listings={listings} />
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-medium">Nothing here yet.</p>
          <p className="mt-2 text-ink-soft">
            Try loosening the filters, or{" "}
            <Link href="/sell" className="link font-semibold text-ink">
              list something of your own
            </Link>
            .
          </p>
        </div>
      )}
    </ExploreView>
  );
}
