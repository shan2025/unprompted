"use client";

import { useEffect, useState } from "react";

// Counts from 0 to `to` after `delay` ms. Renders the final number on the
// server and for reduced-motion visitors, so it's never wrong without JS.
export function CountUp({ to, delay = 0, duration = 900 }: { to: number; delay?: number; duration?: number }) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    setN(0);
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return <>{n}</>;
}
