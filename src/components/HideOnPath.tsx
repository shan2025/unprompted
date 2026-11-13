"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";

/**
 * Renders its children except on the given page, so a header button such as
 * Sell doesn't point at the page you're already on. The path is only known at
 * request time, so the children show until it streams in.
 */
export function HideOnPath({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <Check path={path}>{children}</Check>
    </Suspense>
  );
}

function Check({ path, children }: { path: string; children: React.ReactNode }) {
  return usePathname() === path ? null : children;
}
