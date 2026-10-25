import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import type { ListingCard as ListingCardData } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { Cover } from "./Cover";
import { AiPill, TierStamp } from "./Score";

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group card flex flex-col overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgb(60_40_20/0.25)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
        <Cover slug={listing.slug} category={listing.category} coverFile={listing.coverFile} title={listing.title} />
        <div className="absolute left-3 top-3 rounded-[6px] bg-card/90 px-1.5 py-1 backdrop-blur-sm">
          <TierStamp tier={listing.tier} size="sm" />
        </div>
        {listing.status === "sold" && (
          <span className="absolute right-3 top-3 rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper">Sold</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span className="eyebrow">{categoryLabel(listing.category)}</span>
          {listing.isDemo && <span className="rounded bg-line/70 px-1.5 text-[10px] font-semibold text-muted">DEMO</span>}
        </div>
        <h3 className="mt-1.5 text-lg font-semibold leading-snug text-ink group-hover:text-accent">{listing.title}</h3>
        <p className="mt-1 text-sm text-muted">by {listing.creatorName}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="font-display text-lg font-semibold">{formatPrice(listing.priceCents)}</span>
          <AiPill percent={listing.aiPercent} tier={listing.tier} verified={listing.processVerified} />
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings }: { listings: ListingCardData[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="aspect-[4/3] animate-pulse bg-line/50" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-line/70" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-line/70" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-line/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
