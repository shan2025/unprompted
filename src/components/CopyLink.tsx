"use client";

import { useState } from "react";

/** Copies a link and says so for a moment. Falls back to showing the link if the browser refuses. */
export function CopyLink({
  url,
  label = "Copy",
  copiedLabel = "Copied",
  className = "btn-ghost px-4 py-2",
  icon = false,
}: {
  url: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  icon?: boolean;
}) {
  const [done, setDone] = useState<"copied" | "failed" | null>(null);

  function copy() {
    navigator.clipboard
      .writeText(url)
      .then(() => setDone("copied"))
      .catch(() => setDone("failed"))
      .finally(() => setTimeout(() => setDone(null), 2000));
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={copy} className={className} aria-label={icon ? label : undefined} title={icon ? label : undefined}>
        {icon ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </svg>
        ) : done === "copied" ? (
          copiedLabel
        ) : (
          label
        )}
      </button>
      <span role="status" className={icon && done ? "absolute right-0 top-full mt-2 whitespace-nowrap text-xs font-semibold text-human" : "sr-only"}>
        {done === "copied" ? "Link copied" : done === "failed" ? `Couldn't copy. The link is ${url}` : ""}
      </span>
    </span>
  );
}
