import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreResults, type Params } from "@/components/BrowseResults";
import { GridSkeleton } from "@/components/ListingCard";

export const metadata: Metadata = {
  title: "Explore",
  description: "Read and watch writing, art, film, code, handicrafts and more, made by people. Every piece shows how much AI was involved.",
  alternates: { canonical: "/explore" },
};

// One craft has its own page (explore/[category]); next.config.ts sends ?category=crafts there.
export default function ExplorePage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<GridSkeleton />}>
        <ExploreResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
