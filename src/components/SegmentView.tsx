"use client";

import { useState } from "react";
import type { Segment } from "@/lib/analysis/text";

export function SegmentView({
  text,
  segments,
  kind,
  textClass = "text-[16px]",
}: {
  text: string;
  segments: Segment[];
  kind: string | null;
  /** Type size for prose; code always uses the mono style. */
  textClass?: string;
}) {
  const [show, setShow] = useState(false);
  const flagged = segments.filter((s) => s.ai >= 0.35).length;
  const mono = kind === "code";

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const seg of [...segments].sort((a, b) => a.start - b.start)) {
    if (seg.start > cursor) nodes.push(text.slice(cursor, seg.start));
    const piece = text.slice(seg.start, seg.end);
    if (show && seg.ai >= 0.35) {
      nodes.push(
        <mark
          key={seg.start}
          title={`${Math.round(seg.ai * 100)}% likely machine-made${seg.signals.length ? `: ${seg.signals.join("; ")}` : ""}`}
          className="rounded-sm text-ink"
          style={{ backgroundColor: seg.ai >= 0.65 ? "var(--mark)" : "color-mix(in srgb, var(--mark) 45%, transparent)" }}
        >
          {piece}
        </mark>,
      );
    } else {
      nodes.push(<span key={seg.start}>{piece}</span>);
    }
    cursor = seg.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return (
    <div>
      {segments.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-pressed={show}
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-soft hover:border-ink"
          >
            {show ? "Hide" : "Show"} passage analysis
          </button>
          <span className="text-xs text-muted">
            {flagged === 0
              ? `All ${segments.length} passages read as human-written.`
              : `${flagged} of ${segments.length} passages show machine-like patterns.`}
          </span>
        </div>
      )}
      <div
        className={`whitespace-pre-wrap break-words leading-relaxed text-ink ${
          mono ? "no-scrollbar overflow-x-auto rounded-xl border border-line bg-paper p-4 font-mono text-[13px]" : textClass
        }`}
      >
        {nodes}
      </div>
    </div>
  );
}
