import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketplaceResults, type Params } from "@/components/BrowseResults";
import { GridSkeleton } from "@/components/ListingCard";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Buy writing, art, film, code, handicrafts and more, made by people. Every piece shows how much AI was involved.",
  alternates: { canonical: "/marketplace" },
};

// One craft has its own page (marketplace/[category]); next.config.ts sends ?category=crafts there.
export default function MarketplacePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<GridSkeleton />}>
        <MarketplaceResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
