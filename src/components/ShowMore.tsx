"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Adds the next batch to a list. `href` is the same page asking for one more
 * batch; the list grows in place, without jumping back to the top, and the
 * Back button still leaves the page in one step.
 */
export function ShowMore({ href }: { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <p className="mt-10 text-center">
      <Link
        href={href}
        scroll={false}
        replace
        aria-busy={pending}
        onClick={(e) => {
          // Let new-tab and other modified clicks behave like normal links.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          if (!pending) startTransition(() => router.replace(href, { scroll: false }));
        }}
        className="btn-ghost min-w-44"
      >
        {pending ? "Loading…" : "Show more"}
      </Link>
    </p>
  );
}
