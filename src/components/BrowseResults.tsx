// The results under Explore and the marketplace, shared by the plain pages and
// each craft's own page (/explore/crafts). A craft page adds a short note on how
// AI is scored for that craft and, when it holds real work, structured data.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExploreView } from "@/components/ExploreView";
import { FeedGrid } from "@/components/FeedGrid";
import { JsonLd } from "@/components/JsonLd";
import { ShowMore } from "@/components/ShowMore";
import { getCurrentUser } from "@/lib/auth";
import { browseHref, browseQueryHref, categoryHeading, type BrowsePage } from "@/lib/browse";
import { CATEGORY_IDS, isCategory, STAGE_WEIGHTS, type CategoryId } from "@/lib/categories";
import { searchListings, usedCategories } from "@/lib/data";
import type { FeedItem } from "@/lib/feed";
import { searchFeed } from "@/lib/feed";
import { plural, siteUrl } from "@/lib/format";
import { isCompanyOwner, merchStoreUrl } from "@/lib/merch";
import { batches, firstBatches } from "@/lib/paging";
import { STAGES, type Stage } from "@/lib/scoring";
import { isShow, type Show } from "@/lib/show";
import { EXPLORE_SORTS, SORTS, type ExploreSort, type Sort } from "@/lib/sorts";
import { breadcrumbs } from "@/lib/structured-data";

export type Params = Record<string, string | string[] | undefined>;

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

function readFilters(params: Params) {
  const maxAiRaw = one(params.maxAi) ?? "";
  return {
    q: one(params.q)?.trim().slice(0, 100) ?? "",
    maxAi: ["5", "20", "50"].includes(maxAiRaw) ? Number(maxAiRaw) : undefined,
    sortRaw: one(params.sort) ?? "new",
    verified: one(params.verified) === "1",
  };
}

/** The same filters on the other page, keeping the search, AI limit, sort and evidence filter. */
function sameFiltersOn(page: BrowsePage, categories: CategoryId[], params: Params) {
  const qs = new URLSearchParams();
  for (const key of ["q", "maxAi", "sort", "verified"]) {
    const v = one(params[key]);
    if (v) qs.set(key, v);
  }
  return browseQueryHref(page, categories, qs);
}

// One batch of results; "Show more" adds another (lib/paging.ts).
const BATCH = 60;

/** This page with the same filters and one more batch of results. */
function moreHref(page: BrowsePage, categories: CategoryId[], params: Params, shown: number) {
  const qs = new URLSearchParams();
  for (const key of ["q", "maxAi", "sort", "verified", "show"]) {
    const v = one(params[key]);
    if (v) qs.set(key, v);
  }
  qs.set("more", String(shown + 1));
  return browseQueryHref(page, categories, qs);
}

/** Title, description and canonical address for a craft's page. Unknown crafts and pages with no real work stay out of search. */
export async function craftMetadata(page: BrowsePage, category: string): Promise<Metadata> {
  // Here as well as in the page, so crawlers get a real 404 before anything streams.
  if (!isCategory(category)) notFound();
  const { title, intro } = categoryHeading(page, category);
  const path = browseHref(page, category);
  return {
    title,
    description: intro,
    alternates: { canonical: path },
    robots: (await craftPageIndexable(page, category)) ? undefined : { index: false },
    openGraph: { siteName: "Unprompters", title, description: intro, type: "website", url: path },
  };
}

/** Whether a craft page has real (non-demo) work, so it's worth a search engine's time. */
export async function craftPageIndexable(page: BrowsePage, category: CategoryId) {
  return (await usedCategories(page, { realOnly: true })).includes(category);
}

export async function ExploreResults({ searchParams, category }: { searchParams: Promise<Params>; category?: CategoryId }) {
  const params = await searchParams;
  const { q, maxAi, sortRaw, verified } = readFilters(params);
  const categories = category ? [category] : parseCategories(params.category);
  const sort: ExploreSort = sortRaw in EXPLORE_SORTS ? (sortRaw as ExploreSort) : "new";
  const showRaw = one(params.show);
  // Old links asked for ?show=sale here; that work now lives on the marketplace.
  if (showRaw === "sale") redirect(sameFiltersOn("marketplace", categories, params));
  const show: Show = isShow(showRaw) ? showRaw : "all";

  const shown = batches(params.more);
  const [found, available, indexable] = await Promise.all([
    searchFeed({ q, categories, maxAi, sort, verified, show, limit: shown * BATCH + 1 }),
    usedCategories("explore"),
    category ? craftPageIndexable("explore", category) : false,
  ]);
  const { items, more } = firstBatches(found, shown * BATCH);

  return (
    <ExploreView category={category} available={available} filters={{ categories }} fields={{ q, maxAi: maxAi?.toString() ?? "", sort, verified, show }}>
      {category && indexable && <CraftJsonLd page="explore" category={category} items={items} />}
      {/* The empty state below says it when nothing matches. */}
      {items.length > 0 && <p className="mb-4 text-sm text-muted">{more ? `Showing the first ${items.length} works` : plural(items.length, "work")}</p>}
      {items.length > 0 ? (
        <>
          <FeedGrid items={items} reveal />
          {more && <ShowMore href={moreHref("explore", categories, params, shown)} />}
          <p className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 text-ink-soft">
            Looking to buy? Some creators sell their work.
            <Link href={sameFiltersOn("marketplace", categories, params)} className="link text-ink">
              See the marketplace
            </Link>
          </p>
        </>
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
      {category && <HowCraftIsScored page="explore" category={category} />}
    </ExploreView>
  );
}

export async function MarketplaceResults({ searchParams, category }: { searchParams: Promise<Params>; category?: CategoryId }) {
  const params = await searchParams;
  const storeUrl = merchStoreUrl();
  const { q, maxAi, sortRaw, verified } = readFilters(params);
  const categories = category ? [category] : parseCategories(params.category);
  const sort: Sort = sortRaw in SORTS ? (sortRaw as Sort) : "new";
  const filtered = Boolean(q || categories.length || maxAi !== undefined || verified);

  const shown = batches(params.more);
  const [found, available, indexable, viewer] = await Promise.all([
    searchListings({ q, categories, maxAi, sort, verified, price: "paid", limit: shown * BATCH + 1 }),
    usedCategories("marketplace"),
    category ? craftPageIndexable("marketplace", category) : false,
    getCurrentUser(),
  ]);
  const { items: listings, more } = firstBatches(found, shown * BATCH);
  const items = listings.map((listing) => ({ kind: "listing" as const, listing }));

  return (
    <ExploreView
      page="marketplace" category={category} available={available} filters={{ categories }}
      fields={{ q, maxAi: maxAi?.toString() ?? "", sort, verified, show: "all" }}
      actions={
        <nav aria-label="Marketplace actions" className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/sell" className="btn-primary">List your work</Link>
          {storeUrl && <a href={storeUrl} className="link">Shop Unprompters merch</a>}
          {isCompanyOwner(viewer) && <Link href="/admin/merch" className="link">My merch analytics</Link>}
        </nav>
      }
    >
      {category && indexable && <CraftJsonLd page="marketplace" category={category} items={items} />}
      {items.length > 0 && <p className="mb-4 text-sm text-muted">{more ? `Showing the first ${items.length} pieces for sale` : `${plural(items.length, "piece")} for sale`}</p>}
      {items.length > 0 ? (
        <>
          <FeedGrid items={items} reveal />
          {more && <ShowMore href={moreHref("marketplace", categories, params, shown)} />}
        </>
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-medium">
            {filtered ? "No creator listings match your filters." : "No creator listings yet."}
          </p>
          {filtered && <Link href="/marketplace" className="link mt-2 inline-block">Clear filters</Link>}
        </div>
      )}
      {category && <HowCraftIsScored page="marketplace" category={category} />}
    </ExploreView>
  );
}

// How the stages read in a sentence, as on the home page and in llms.txt.
const STAGE_PHRASES: Record<Stage, string> = {
  ideation: "the idea",
  creation: "the making",
  refinement: "the polish",
  assets: "supporting assets",
};

// A plain, factual note drawn from the scoring weights, so each craft page
// says something true and specific about that craft.
function HowCraftIsScored({ page, category }: { page: BrowsePage; category: CategoryId }) {
  const { noun } = categoryHeading(page, category);
  const weights = [...STAGES].sort((a, b) => STAGE_WEIGHTS[category][b] - STAGE_WEIGHTS[category][a]);
  const parts = weights.map((s, i) => `${STAGE_PHRASES[s]}${i === 0 ? " counts for" : ""} ${Math.round(STAGE_WEIGHTS[category][s] * 100)}%`);
  const sentence = `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  const other: BrowsePage = page === "explore" ? "marketplace" : "explore";
  return (
    <section className="mt-14 max-w-2xl border-t border-line pt-8">
      <h2 className="text-2xl font-light">How AI is scored for {noun}</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Every piece on Unprompters carries an estimate of how much of the work came from AI. It weighs four stages, by
        what matters most in the craft. For {noun}, {sentence}. The creator&apos;s own disclosure is the floor, and scans
        can only raise the score. Process evidence is reviewed separately and does not change the number.
      </p>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/standard" className="link text-ink">
          How scoring works
        </Link>
        <Link href={browseHref(other, category)} className="link text-ink">
          {other === "marketplace" ? `${noun[0].toUpperCase()}${noun.slice(1)} for sale` : `All ${noun}, free to explore`}
        </Link>
      </p>
    </section>
  );
}

function CraftJsonLd({ page, category, items }: { page: BrowsePage; category: CategoryId; items: FeedItem[] }) {
  const base = siteUrl();
  const { title, intro } = categoryHeading(page, category);
  const path = browseHref(page, category);
  // Only real work: demo pieces never go to search engines.
  const real = items
    .map((item) => (item.kind === "post" ? { ...item.post, path: `/journal/${item.post.slug}` } : { ...item.listing, path: `/listing/${item.listing.slug}` }))
    .filter((item) => !item.isDemo)
    .slice(0, 30);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            name: title,
            description: intro,
            url: `${base}${path}`,
            isPartOf: { "@id": `${base}/#website` },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: real.length,
              itemListElement: real.map((item, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}${item.path}`, name: item.title })),
            },
          },
          breadcrumbs([
            { name: page === "marketplace" ? "Marketplace" : "Explore", path: `/${page}` },
            { name: title, path },
          ]),
        ],
      }}
    />
  );
}
