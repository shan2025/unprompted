"use client";

import { useEffect } from "react";

// Plays the .reveal entrance (globals.css) once, as each element scrolls into
// view. Elements only start hidden once this has run, so the page never loses
// content without JavaScript. Watches for streamed-in sections too.
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    const watch = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    watch();
    root.classList.add("reveal-ready");
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}
