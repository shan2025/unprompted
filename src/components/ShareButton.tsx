"use client";

import { useState } from "react";

/** Opens the phone's share sheet, or copies the link where there isn't one. */
export function ShareButton({ path, title, className = "" }: { path: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Closing the share sheet rejects; nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} aria-label="Share" className={className}>
      <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" strokeLinejoin="round" />
      </svg>
      <span role="status" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}
