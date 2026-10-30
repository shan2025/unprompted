"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { CATEGORIES, categoryLabel, type CategoryId } from "@/lib/categories";
import { SORTS, type Sort } from "@/lib/sorts";

const AI_LIMITS = [
  ["", "Any AI level"],
  ["5", "Human-made only (≤5%)"],
  ["20", "Up to 20%"],
  ["50", "Up to 50%"],
] as const;

type Filters = { categories: CategoryId[]; more: boolean };
type Fields = { q: string; maxAi: string; sort: Sort; verified: boolean };

function listLabels(ids: CategoryId[]) {
  const labels = ids.map(categoryLabel);
  return labels.length < 2 ? labels.join("") : `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}`;
}

function toQuery(f: Filters & Fields) {
  const qs = new URLSearchParams();
  if (f.q) qs.set("q", f.q);
  if (f.categories.length) qs.set("category", f.categories.join(","));
  if (f.maxAi) qs.set("maxAi", f.maxAi);
  if (f.sort !== "new") qs.set("sort", f.sort);
  if (f.verified) qs.set("verified", "1");
  if (f.more) qs.set("more", "1");
  const query = qs.toString();
  return query ? `/explore?${query}` : "/explore";
}

// Every filter applies as soon as it changes: chips and the heading update
// on click, and the results dim while the server fetches the new ones.
export function ExploreView({
  filters,
  fields,
  children,
}: {
  filters: Filters;
  fields: Fields;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(filters);
  const { categories, more } = shown;
  const formRef = useRef<HTMLFormElement>(null);
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When the URL changes some other way (Back, Forward), make the fields match
  // it, without touching the search box while a typed search is waiting.
  const { q, maxAi, sort, verified } = fields;
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const el = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    if (typing.current === undefined) el("q").value = q;
    el("maxAi").value = maxAi;
    el("sort").value = sort;
    (el("verified") as HTMLInputElement).checked = verified;
  }, [q, maxAi, sort, verified]);

  // What the form shows right now, which may be ahead of the URL.
  function liveFields(): Fields {
    if (!formRef.current) return fields;
    const data = new FormData(formRef.current);
    const sort = String(data.get("sort") ?? "new");
    return {
      q: String(data.get("q") ?? "").trim(),
      maxAi: String(data.get("maxAi") ?? ""),
      sort: sort in SORTS ? (sort as Sort) : "new",
      verified: data.get("verified") === "1",
    };
  }

  function apply(next: Filters) {
    clearTimeout(typing.current);
    typing.current = undefined;
    // Keep the picks in the fixed category order, as the server does.
    const ordered = { ...next, categories: CATEGORIES.map((c) => c.id).filter((id) => next.categories.includes(id)) };
    startTransition(() => {
      setShown(ordered);
      router.push(toQuery({ ...ordered, ...liveFields() }), { scroll: false });
    });
  }

  function go(next: Filters, e: React.MouseEvent) {
    // Let new-tab and other modified clicks behave like normal links.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    apply(next);
  }

  const hrefFor = (next: Filters) => toQuery({ ...next, ...fields });

  const chip = (next: Filters, props: { active?: boolean; label?: string; children: React.ReactNode; k?: string }) => (
    <Chip key={props.k} href={hrefFor(next)} next={next} onGo={go} active={props.active} label={props.label}>
      {props.children}
    </Chip>
  );
  const others = CATEGORIES.filter((c) => !categories.includes(c.id));

  return (
    <>
      <div className="mb-8">
        <p className="eyebrow">Explore</p>
        <h1 className="mt-1 text-4xl font-light">{categories.length ? listLabels(categories) : "Everything"}</h1>
      </div>

      <form
        ref={formRef}
        action="/explore"
        role="search"
        className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]"
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
        <input
          name="q"
          type="search"
          defaultValue={fields.q}
          placeholder="Search titles, descriptions, creators"
          className="field sm:col-span-2 lg:col-span-1"
          aria-label="Search"
          enterKeyHint="search"
        />
        {categories.length > 0 && <input type="hidden" name="category" value={categories.join(",")} />}
        <select name="maxAi" defaultValue={fields.maxAi} className="field" aria-label="Maximum AI involvement">
          {AI_LIMITS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={fields.sort} className="field" aria-label="Sort">
          {Object.entries(SORTS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2 lg:col-span-3">
          <input type="checkbox" name="verified" value="1" defaultChecked={fields.verified} className="h-4 w-4 accent-[var(--accent)]" />
          Only show work with verified process evidence
        </label>
        <noscript>
          <button className="btn-primary">Apply</button>
        </noscript>
      </form>

      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.length === 0 ? (
          <>
            {chip({ categories: [], more: false }, { active: true, children: "All" })}
            {CATEGORIES.map((c) => chip({ categories: [c.id], more: false }, { k: c.id, children: c.label }))}
          </>
        ) : (
          <>
            {categories.map((id) =>
              chip(
                { categories: categories.filter((c) => c !== id), more },
                {
                  k: id,
                  active: true,
                  label: `Remove ${categoryLabel(id)}`,
                  children: (
                    <>
                      {categoryLabel(id)}
                      <span aria-hidden="true" className="ml-1.5 opacity-70">
                        ×
                      </span>
                    </>
                  ),
                },
              ),
            )}
            {more
              ? others.map((c) =>
                  chip(
                    { categories: [...categories, c.id], more: true },
                    {
                      k: c.id,
                      label: `Add ${c.label}`,
                      children: (
                        <>
                          <span aria-hidden="true" className="mr-1">
                            +
                          </span>
                          {c.label}
                        </>
                      ),
                    },
                  ),
                )
              : others.length > 0 &&
                chip(
                  { categories, more: true },
                  {
                    children: (
                      <>
                        <span aria-hidden="true" className="mr-1">
                          +
                        </span>
                        More categories
                      </>
                    ),
                  },
                )}
            <Link
              href={hrefFor({ categories: [], more: false })}
              onClick={(e) => go({ categories: [], more: false }, e)}
              scroll={false}
              className="shrink-0 self-center whitespace-nowrap px-2 text-sm text-muted hover:text-ink"
            >
              Show everything
            </Link>
          </>
        )}
      </div>

      <div aria-busy={pending} className={`transition-opacity duration-200 ${pending ? "opacity-50" : ""}`}>
        {children}
      </div>
    </>
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
