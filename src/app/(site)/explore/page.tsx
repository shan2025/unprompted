import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton, ListingGrid } from "@/components/ListingCard";
import { CATEGORIES, CATEGORY_IDS, categoryLabel, type CategoryId } from "@/lib/categories";
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

// Categories arrive as a comma-separated list: ?category=writing,poetry
function parseCategories(v: string | string[] | undefined): CategoryId[] {
  const ids = (Array.isArray(v) ? v : [v ?? ""]).flatMap((s) => s.split(","));
  return CATEGORY_IDS.filter((id) => ids.includes(id));
}

function listLabels(ids: CategoryId[]) {
  const labels = ids.map(categoryLabel);
  return labels.length < 2 ? labels.join("") : `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}`;
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
  const showMore = one(params.more) === "1";

  const listings = await searchListings({ q, categories, maxAi, sort, verified });
  const heading = categories.length ? listLabels(categories) : "Everything";

  // Chip links keep the other filters and change only the categories.
  const hrefWith = (ids: CategoryId[], more = false) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (ids.length) qs.set("category", ids.join(","));
    if (maxAi !== undefined) qs.set("maxAi", String(maxAi));
    if (sort !== "new") qs.set("sort", sort);
    if (verified) qs.set("verified", "1");
    if (more) qs.set("more", "1");
    const query = qs.toString();
    return query ? `/explore?${query}` : "/explore";
  };
  const others = CATEGORIES.filter((c) => !categories.includes(c.id));

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">Explore</p>
        <h1 className="mt-1 text-4xl font-light">{heading}</h1>
      </div>

      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Search titles, descriptions, creators" className="field" aria-label="Search" />
        {categories.length > 0 && <input type="hidden" name="category" value={categories.join(",")} />}
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
        <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2 lg:col-span-4">
          <input type="checkbox" name="verified" value="1" defaultChecked={verified} className="h-4 w-4 accent-[var(--accent)]" />
          Only show work with verified process evidence
        </label>
      </form>

      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.length === 0 ? (
          <>
            <Chip href={hrefWith([])} active>
              All
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} href={hrefWith([c.id])}>
                {c.label}
              </Chip>
            ))}
          </>
        ) : (
          <>
            {categories.map((id) => (
              <Chip key={id} href={hrefWith(categories.filter((c) => c !== id), showMore)} active label={`Remove ${categoryLabel(id)}`}>
                {categoryLabel(id)}
                <span aria-hidden="true" className="ml-1.5 opacity-70">
                  ×
                </span>
              </Chip>
            ))}
            {showMore ? (
              others.map((c) => (
                <Chip key={c.id} href={hrefWith([...categories, c.id], true)} label={`Add ${c.label}`}>
                  <span aria-hidden="true" className="mr-1">
                    +
                  </span>
                  {c.label}
                </Chip>
              ))
            ) : (
              others.length > 0 && (
                <Chip href={hrefWith(categories, true)}>
                  <span aria-hidden="true" className="mr-1">
                    +
                  </span>
                  More categories
                </Chip>
              )
            )}
            <Link href={hrefWith([])} className="shrink-0 self-center whitespace-nowrap px-2 text-sm text-muted hover:text-ink">
              Show everything
            </Link>
          </>
        )}
      </div>

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
    </>
  );
}

function Chip({ href, active = false, label, children }: { href: string; active?: boolean; label?: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      aria-current={active ? "true" : undefined}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-[0.97] ${
        active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}
