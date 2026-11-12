"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

// Counts from 0 to `to` after `delay` ms. Renders the final number on the
// server and for reduced-motion visitors, so it's never wrong without JS.
// `format` "number" adds thousands separators; "money" reads `to` as cents.
export function CountUp({
  to,
  delay = 0,
  duration = 900,
  format,
}: {
  to: number;
  delay?: number;
  duration?: number;
  format?: "number" | "money";
}) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    // Whole-dollar amounts count in dollars, so no cents flicker in on the way up.
    const step = format === "money" && to % 100 === 0 ? 100 : 1;
    // The first frame (t = 0) sets it to 0, while the number is still faded out.
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      setN(Math.round(((to / step) * (1 - Math.pow(1 - t, 3)))) * step);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration, format]);
  return <>{format === "money" ? formatMoney(n) : format === "number" ? n.toLocaleString("en-US") : n}</>;
}
