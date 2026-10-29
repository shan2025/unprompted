"use client";

// Form sections shared by the sell form and the journal write form, so the
// disclosure and evidence steps stay identical in both.

import { useEffect, useRef, useState } from "react";
import { MAX_EVIDENCE, type FieldErrors, type PreviewResult } from "@/lib/listing-form";
import { EVIDENCE_KINDS, LEVELS, LEVEL_INFO, STAGES, STAGE_INFO, type Level } from "@/lib/scoring";
import { ScoreCard } from "./Score";
import { SegmentView } from "./SegmentView";

const EVIDENCE_OPTIONS = Object.entries(EVIDENCE_KINDS).filter(([k]) => k !== "c2pa");

export function FieldError({ errors, name }: { errors: FieldErrors; name: string }) {
  if (!errors[name]) return null;
  return <p className="mt-1.5 text-sm font-medium text-heavy">{errors[name]}</p>;
}

export function Section({ step, title, intro, children }: { step: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-7">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-display text-sm font-light text-accent">{step}</span>
        <div>
          <h2 className="text-2xl font-normal">{title}</h2>
          {intro && <p className="mt-1 text-sm text-ink-soft">{intro}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function ImageField({ errors, hint }: { errors: FieldErrors; hint: string }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  useEffect(() => () => void (coverUrl && URL.revokeObjectURL(coverUrl)), [coverUrl]);

  return (
    <div>
      <label htmlFor="cover" className="label">
        Image <span className="font-normal text-muted">(optional)</span>
      </label>
      <div className="flex items-center gap-4">
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img src={coverUrl} alt="" className="h-16 w-20 rounded-lg border border-line object-cover" />
        )}
        <input
          id="cover"
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setCoverUrl(f ? URL.createObjectURL(f) : null);
          }}
        />
      </div>
      <p className="hint">{hint}</p>
      <FieldError errors={errors} name="cover" />
    </div>
  );
}

export function DisclosureFields({ errors, defaultAi }: { errors: FieldErrors; defaultAi?: Level }) {
  return (
    <>
      {STAGES.map((stage) => (
        <fieldset key={stage}>
          <legend className="text-sm font-semibold">{STAGE_INFO[stage].label}</legend>
          <p className="mb-2 text-xs text-muted">{STAGE_INFO[stage].hint}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVELS.map((level) => (
              <label
                key={level}
                title={LEVEL_INFO[level].hint}
                className="cursor-pointer rounded-lg border border-line px-3 py-2 text-center text-sm font-medium text-ink-soft transition-colors hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-paper"
              >
                <input type="radio" name={`disclosure_${stage}`} value={level} defaultChecked={level === (stage === "creation" ? (defaultAi ?? "none") : "none")} className="sr-only" />
                {LEVEL_INFO[level].label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <ul className="grid gap-1 rounded-xl bg-paper p-4 text-xs text-ink-soft sm:grid-cols-2">
        {LEVELS.map((level) => (
          <li key={level}>
            <strong className="text-ink">{LEVEL_INFO[level].label}:</strong> {LEVEL_INFO[level].hint}
          </li>
        ))}
      </ul>
      <FieldError errors={errors} name="disclosure" />
      <div>
        <label htmlFor="aiNotes" className="label">
          In your own words <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="aiNotes"
          name="aiNotes"
          rows={2}
          maxLength={1000}
          className="field"
          placeholder="e.g. I used a grammar checker on the final draft. Everything else is mine."
        />
        <FieldError errors={errors} name="aiNotes" />
      </div>
    </>
  );
}

export function EvidenceFields({ errors }: { errors: FieldErrors }) {
  const [rows, setRows] = useState<number[]>([0]);
  const nextRow = useRef(1);

  return (
    <>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[180px_1fr_auto]">
            <select name="evidence_kind" className="field" defaultValue="drafts" aria-label="Evidence type">
              {EVIDENCE_OPTIONS.map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <div className="grid gap-2">
              <input name="evidence_url" className="field" placeholder="https://… (repo, video, drive folder)" aria-label="Evidence link" />
              <input name="evidence_note" className="field" placeholder="What it shows" aria-label="Evidence note" maxLength={300} />
            </div>
            <button
              type="button"
              className="self-start rounded-lg px-3 py-2 text-sm text-muted hover:text-heavy"
              onClick={() => setRows((r) => r.filter((x) => x !== row))}
              aria-label="Remove evidence"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {rows.length < MAX_EVIDENCE && (
        <button type="button" className="btn-ghost" onClick={() => setRows((r) => [...r, nextRow.current++])}>
          + Add evidence
        </button>
      )}
      <FieldError errors={errors} name="evidence" />
    </>
  );
}

export function ScorePreview({
  result,
  reviewNote,
  segmentsLabel,
}: {
  result: PreviewResult | null;
  reviewNote: string;
  segmentsLabel: string;
}) {
  if (!result) {
    return (
      <div className="card p-6">
        <span className="eyebrow">Your score</span>
        <p className="mt-3 font-display text-2xl font-normal leading-snug">See your number before anyone else does.</p>
        <p className="mt-2 text-sm text-ink-soft">
          Fill in the form and press <strong>Check my score</strong>. We combine your disclosure, a scan of the work, and
          your evidence. Nothing is saved until you publish.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ScoreCard score={result.score} />
      {result.score.needsReview && <p className="rounded-xl border border-assist/40 bg-card p-4 text-sm text-ink-soft">{reviewNote}</p>}
      {result.media && (
        <div className="card p-4 text-sm">
          <span className="eyebrow">Image metadata</span>
          <ul className="mt-2 space-y-1.5 text-ink-soft">
            {result.media.findings.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {result.segments.length > 0 && (
        <div className="card max-h-[420px] overflow-y-auto no-scrollbar p-4">
          <span className="eyebrow mb-3 block">{segmentsLabel}</span>
          <SegmentView text={result.previewText} segments={result.segments} kind={result.previewKind} />
        </div>
      )}
    </div>
  );
}
