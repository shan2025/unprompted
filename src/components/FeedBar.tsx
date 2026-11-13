"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// The strip above the phone home feed: a For you / Following switch as a
// dropdown, then crafts to narrow the feed. Both live in the URL, so a
// filtered feed can be shared and survives a refresh.

export type FeedTab = "foryou" | "following";

const FEEDS: { id: FeedTab; label: string; hint: string }[] = [
  { id: "foryou", label: "For you", hint: "New work from across Unprompters" },
  { id: "following", label: "Following", hint: "Only people you follow" },
];

function feedHref(feed: FeedTab, category?: string) {
  const params = new URLSearchParams();
  if (feed === "following") params.set("feed", "following");
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function FeedBar({
  feed,
  category,
  categories,
  signedIn,
}: {
  feed: FeedTab;
  category?: string;
  categories: { id: string; label: string }[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const current = FEEDS.find((f) => f.id === feed) ?? FEEDS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative border-b border-line">
      <nav aria-label="Feed" className="no-scrollbar flex h-12 items-center gap-2 overflow-x-auto px-4">
        <button
          ref={button}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-ink pl-3.5 pr-2.5 text-sm font-semibold text-white"
        >
          {current.label}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line" />
        {categories.map((c) => {
          const active = c.id === category;
          return (
            <Link
              key={c.id}
              href={feedHref(feed, active ? undefined : c.id)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm ${
                active ? "bg-field font-semibold text-ink" : "font-medium text-ink-soft"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      {open && (
        <div role="menu" aria-label="Feed" className="absolute left-4 top-full z-30 -mt-1 w-60 rounded-xl border border-line bg-white p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.14)]">
          {FEEDS.map((f) => {
            const selected = f.id === feed;
            // Following needs an account; signed-out people go to log in first.
            const href = f.id === "following" && !signedIn ? "/login" : feedHref(f.id, category);
            return (
              <Link
                key={f.id}
                href={href}
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => setOpen(false)}
                className={`flex min-h-[52px] items-center gap-2.5 rounded-lg px-2.5 py-2 ${selected ? "bg-field" : "hover:bg-field/60"}`}
              >
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-ink">{f.label}</span>
                  <span className="text-xs text-muted">{f.hint}</span>
                </span>
                {selected && (
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
