"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { deletePost } from "@/app/actions/posts";
import { SubmitButton } from "./SubmitButton";

/** The author's own actions on a post card: edit it, copy its link, or delete it. */
export function PostOwnerMenu({ slug, title, returnTo }: { slug: string; title: string; returnTo: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/journal/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const item = "block w-full px-4 py-2.5 text-left text-sm hover:bg-field";

  return (
    <div ref={ref} className="absolute right-3 top-3 z-10">
      <button
        type="button"
        aria-label={`Options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
        className="grid h-9 w-9 place-items-center rounded-full bg-card/95 text-ink shadow-sm hover:bg-card"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-card py-1 shadow-lg">
          {!confirming ? (
            <>
              <Link role="menuitem" href={`/journal/${slug}/edit`} className={item}>
                Edit
              </Link>
              <button role="menuitem" type="button" className={item} onClick={copy}>
                {copied ? "Link copied" : "Copy link"}
              </button>
              <button role="menuitem" type="button" className={`${item} text-heavy`} onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          ) : (
            <form action={deletePost} className="space-y-3 p-4">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <p className="text-sm leading-relaxed text-ink-soft">Delete this post, its comments and appreciations for good?</p>
              <div className="flex items-center gap-4">
                <SubmitButton className="text-sm font-semibold text-heavy hover:underline" pendingText="Deleting…">
                  Yes, delete
                </SubmitButton>
                <button type="button" className="text-sm font-medium text-muted hover:text-ink" onClick={() => setConfirming(false)}>
                  Keep it
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
