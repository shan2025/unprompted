"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { isShow, SHOWS, type Show } from "@/lib/show";
import { EXPLORE_SORTS, SORTS, type Sort } from "@/lib/sorts";

const AI_LIMITS = [
  ["", "Any AI level"],
  ["5", "Human-made only (≤5%)"],
  ["20", "Up to 20%"],
  ["50", "Up to 50%"],
] as const;

type Filters = { categories: CategoryId[] };
type Fields = { q: string; maxAi: string; sort: Sort; verified: boolean; show: Show };

// Explore holds free work; the marketplace holds work for sale. Same filters,
// except the marketplace sorts by price and has no "what to show" picker.
const PAGES = {
  explore: {
    path: "/explore",
    title: "Explore",
    intro: "Work made by people, with its AI use shown.",
    sorts: EXPLORE_SORTS as Partial<typeof SORTS>,
  },
  marketplace: {
    path: "/marketplace",
    title: "Marketplace",
    intro: "Buy work made by people, with its AI use shown.",
    sorts: SORTS as Partial<typeof SORTS>,
  },
} as const;
type Page = keyof typeof PAGES;

function toQuery(page: Page, f: Filters & Fields) {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.categories.length) qs.set("category", f.categories.join(","));
  if (f.maxAi) qs.set("maxAi", f.maxAi);
  if (f.sort !== "new") qs.set("sort", f.sort);
  if (f.verified) qs.set("verified", "1");
  if (page === "explore" && f.show !== "all") qs.set("show", f.show);
  const query = qs.toString();
  const { path } = PAGES[page];
  return query ? `${path}?${query}` : path;
}

// Every filter applies as soon as it changes: chips and the heading update
// on click, and the results dim while the server fetches the new ones.
export function ExploreView({
  page = "explore",
  available,
  filters,
  fields,
  children,
}: {
  page?: Page;
  /** Categories with something in them on this page. Empty ones get no chip. */
  available: CategoryId[];
  filters: Filters;
  fields: Fields;
  children: React.ReactNode;
}) {
  const { path, title, intro, sorts } = PAGES[page];
  const market = page === "marketplace";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(filters);
  const { categories } = shown;
  const formRef = useRef<HTMLFormElement>(null);
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the URL changes some other way (Back, Forward), make the fields match
  // it, without touching the search box while a typed search is waiting.
  const { q, maxAi, sort, verified, show } = fields;
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const el = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    if (typing.current === undefined) el("q").value = q;
    el("maxAi").value = maxAi;
    el("sort").value = sort;
    (el("verified") as HTMLInputElement).checked = verified;
    const showField = el("show") as HTMLSelectElement | null;
    if (showField) showField.value = show;
  }, [q, maxAi, sort, verified, show]);

  // What the form shows right now, which may be ahead of the URL.
  function liveFields(): Fields {
    if (!formRef.current) return fields;
    const data = new FormData(formRef.current);
    const sort = String(data.get("sort") ?? "new");
    const show = data.get("show");
    return {
      q: String(data.get("q") ?? "").trim(),
      maxAi: String(data.get("maxAi") ?? ""),
      sort: sort in sorts ? (sort as Sort) : "new",
      verified: data.get("verified") === "1",
      show: isShow(show) ? show : "all",
    };
  }

  function apply(next: Filters) {
    clearTimeout(typing.current);
    typing.current = undefined;
    // Keep the picks in the fixed category order, as the server does.
    const ordered = { ...next, categories: CATEGORIES.map((c) => c.id).filter((id) => next.categories.includes(id)) };
    startTransition(() => {
      setShown(ordered);
      router.push(toQuery(page, { ...ordered, ...liveFields() }), { scroll: false });
    });
  }

  function go(next: Filters, e: React.MouseEvent) {
    // Let new-tab and other modified clicks behave like normal links.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    apply(next);
  }

  const chipCategories = CATEGORIES.filter((c) => available.includes(c.id) || categories.includes(c.id));

  const hrefFor = (next: Filters) => toQuery(page, { ...next, ...fields });

  const chip = (next: Filters, props: { active?: boolean; label?: string; children: React.ReactNode; k?: string }) => (
    <Chip key={props.k} href={hrefFor(next)} next={next} onGo={go} active={props.active} label={props.label}>
      {props.children}
    </Chip>
  );

  return (
    <>
      {/* The page heading, search, categories and filters all fit in two short rows,
          so the work itself starts high on the screen. */}
      <form
        ref={formRef}
        action={path}
        role="search"
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          apply(shown);
        }}
        onChange={(e) => {
          if ((e.target as unknown as HTMLInputElement).name !== "q") return apply(shown);
          clearTimeout(typing.current);
          typing.current = setTimeout(() => apply(shown), 400);
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="text-4xl font-light">{title}</h1>
            <p className="mt-1 text-ink-soft">{intro}</p>
          </div>
          <div className="relative w-full sm:w-80">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              type="search"
              defaultValue={fields.q}
              placeholder="Search work and creators"
              className="field pl-10"
              aria-label="Search"
              enterKeyHint="search"
            />
          </div>
        </div>
        {categories.length > 0 && <input type="hidden" name="category" value={categories.join(",")} />}

        {/* Phones scroll the chips sideways. Wide screens keep the filters on the
            right and let the chips wrap beside them, so none is hidden. */}
        <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-3 border-b border-line pb-4 lg:flex-nowrap">
          {/* A picked category keeps its chip even if it's empty, so it can be turned off. */}
          {chipCategories.length > 1 && (
            <div className="-my-1 flex min-w-0 max-w-full gap-2 overflow-x-auto no-scrollbar py-1 lg:flex-1 lg:flex-wrap lg:overflow-visible">
              {chip({ categories: [] }, { active: categories.length === 0, children: "All" })}
              {chipCategories.map((c) => {
                const on = categories.includes(c.id);
                return chip(
                  { categories: on ? categories.filter((id) => id !== c.id) : [...categories, c.id] },
                  { k: c.id, active: on, children: c.label },
                );
              })}
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
            {!market && (
              <PillSelect name="show" defaultValue={fields.show} label="What to show">
                {Object.entries(SHOWS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </PillSelect>
            )}
            <PillSelect name="maxAi" defaultValue={fields.maxAi} label="Maximum AI involvement">
              {AI_LIMITS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </PillSelect>
            <PillSelect name="sort" defaultValue={fields.sort} label="Sort">
              {Object.entries(sorts).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </PillSelect>
            <label
              className="flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:text-ink"
              title="Only show work with process evidence attached"
            >
              <input type="checkbox" name="verified" value="1" defaultChecked={fields.verified} className="h-3.5 w-3.5 accent-[var(--accent)]" />
              Process evidence
            </label>
          </div>
        </div>
        <noscript>
          <button className="btn-primary mt-3">Apply</button>
        </noscript>
      </form>

      <div aria-busy={pending} className={`transition-opacity duration-200 ${pending ? "opacity-50" : ""}`}>
        {children}
      </div>
    </>
  );
}

function PillSelect({ name, defaultValue, label, children }: { name: string; defaultValue: string; label: string; children: React.ReactNode }) {
  return (
    <span className="relative">
      <select
        name={name}
        defaultValue={defaultValue}
        aria-label={label}
        className="appearance-none rounded-full border border-line bg-transparent py-1.5 pl-3.5 pr-8 text-sm text-ink-soft transition-colors hover:border-ink focus:border-ink focus:outline-none"
      >
        {children}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" strokeLinecap="round" />
    </svg>
  );
}

function Chip({
  href,
  next,
  onGo,
  active = false,
  label,
  children,
}: {
  href: string;
  next: Filters;
  onGo: (next: Filters, e: React.MouseEvent) => void;
  active?: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => onGo(next, e)}
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
