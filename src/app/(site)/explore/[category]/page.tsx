import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { craftMetadata, ExploreResults, type Params } from "@/components/BrowseResults";
import { GridSkeleton } from "@/components/ListingCard";
import { isCategory } from "@/lib/categories";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<Params> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return craftMetadata("explore", (await params).category);
}

// One craft on Explore, such as /explore/crafts, with its own title and address for search.
export default function ExploreCraftPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<GridSkeleton />}>
        <Craft params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Craft({ params, searchParams }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  return <ExploreResults searchParams={searchParams} category={category} />;
}
