"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/app/actions/errors";

// What a visitor sees when a page breaks, in place of the framework's bare
// crash screen: what happened, a way to retry, and a way out.
export function ErrorMessage({ error, retry }: { error: unknown; retry: () => void }) {
  // Server errors arrive with a short id and were reported where they happened
  // (instrumentation.ts). Without one, it broke in this browser, so tell us from here.
  const digest = typeof error === "object" && error !== null && "digest" in error && error.digest ? String(error.digest) : "";

  useEffect(() => {
    if (digest) return;
    const message = error instanceof Error ? error.message : String(error);
    void reportClientError({ message, path: window.location.pathname }).catch(() => {});
  }, [error, digest]);

  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center sm:px-6">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-5xl font-light">This page didn&apos;t load.</h1>
      <p className="mt-4 text-lg text-ink-soft">The problem is on our side and it has been logged. Trying again usually works.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-ghost">
          Go to the home page
        </Link>
      </div>
      {digest && <p className="mt-8 text-xs text-muted">If you contact us about this, mention reference {digest}.</p>}
    </div>
  );
}
