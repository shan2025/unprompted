"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

// Counts from 0 to `to` after `delay` ms. Renders the final number on the
// server and for reduced-motion visitors, so it's never wrong without JS.
// `format` "number" adds thousands separators; "money" reads `to` as cents.
// `inView` waits until the number scrolls into view before counting.
export function CountUp({
  to,
  delay = 0,
  duration = 900,
  format,
  currency,
  inView = false,
}: {
  to: number;
  delay?: number;
  duration?: number;
  format?: "number" | "money";
  /** For "money": the ISO currency code. Defaults to US dollars. */
  currency?: string;
  inView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(to);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    // Whole-dollar amounts count in dollars, so no cents flicker in on the way up.
    const step = format === "money" && to % 100 === 0 ? 100 : 1;
    const run = () => {
      // The first frame (t = 0) sets it to 0, while the number is still faded out.
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const t = Math.min(Math.max((now - start) / duration, 0), 1);
        setN(Math.round((to / step) * (1 - Math.pow(1 - t, 3))) * step);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (!inView || !ref.current) {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, delay, duration, format, inView]);

  const text = format === "money" ? formatMoney(n, currency) : format === "number" ? n.toLocaleString("en-US") : n;
  return inView ? <span ref={ref}>{text}</span> : <>{text}</>;
}

/** Text with every whole number in it counting up as it scrolls into view, as in "21–50%" or "+40". */
export function CountedText({ text, delay = 0 }: { text: string; delay?: number }) {
  return text.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? <CountUp key={i} to={Number(part)} delay={delay} inView /> : part,
  );
}
