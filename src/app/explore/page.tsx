import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { CATEGORIES, categoryLabel, isCategory } from "@/lib/categories";
import { searchListings, SORTS, type Sort } from "@/lib/data";

export const metadata: Metadata = { title: "Explore" };

type Params = Record<string, string | string[] | undefined>;

const AI_LIMITS = [
  ["", "Any"],
  ["5", "Human-made only (≤5%)"],
  ["20", "Up to 20%"],
  ["50", "Up to 50%"],
] as const;

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

async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params.q)?.trim().slice(0, 100) ?? "";
  const category = one(params.category) ?? "";
  const maxAiRaw = one(params.maxAi) ?? "";
  const maxAi = ["5", "20", "50"].includes(maxAiRaw) ? Number(maxAiRaw) : undefined;
  const sortRaw = one(params.sort) ?? "new";
  const sort: Sort = sortRaw in SORTS ? (sortRaw as Sort) : "new";
  const verified = one(params.verified) === "1";

  const listings = await searchListings({ q, category, maxAi, sort, verified });
  const heading = isCategory(category) ? categoryLabel(category) : "Everything";

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">Explore</p>
        <h1 className="mt-1 text-4xl font-semibold">{heading}</h1>
      </div>

      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Search titles, descriptions, creators" className="field" aria-label="Search" />
        <select name="category" defaultValue={isCategory(category) ? category : ""} className="field" aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="maxAi" defaultValue={maxAi?.toString() ?? ""} className="field" aria-label="Maximum AI involvement">
          {AI_LIMITS.map(([v, l]) => (
            <option key={v} value={v}>
              {v ? l : "Any AI level"}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="field" aria-label="Sort">
          {Object.entries(SORTS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button className="btn-primary">Apply</button>
        <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2 lg:col-span-5">
          <input type="checkbox" name="verified" value="1" defaultChecked={verified} className="h-4 w-4 accent-[var(--accent)]" />
          Only show work with verified process evidence
        </label>
      </form>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <Chip href="/explore" active={!isCategory(category)}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} href={`/explore?category=${c.id}`} active={category === c.id}>
            {c.label}
          </Chip>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted">
        {listings.length === 0 ? "No listings match." : `${listings.length} ${listings.length === 1 ? "listing" : "listings"}`}
      </p>
      {listings.length > 0 ? (
        <ListingGrid listings={listings} />
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-semibold">Nothing here yet.</p>
          <p className="mt-2 text-ink-soft">
            Try loosening the filters, or{" "}
            <Link href="/sell" className="link font-semibold text-ink">
              list something of your own
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}
