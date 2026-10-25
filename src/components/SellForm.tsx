"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createListing, previewAssessment } from "@/app/actions/listings";
import { CATEGORIES, LICENSES } from "@/lib/categories";
import { MAX_EVIDENCE, type FieldErrors, type PreviewState } from "@/lib/listing-form";
import { EVIDENCE_KINDS, LEVELS, LEVEL_INFO, STAGES, STAGE_INFO } from "@/lib/scoring";
import { ScoreCard } from "./Score";
import { SegmentView } from "./SegmentView";

const EVIDENCE_OPTIONS = Object.entries(EVIDENCE_KINDS).filter(([k]) => k !== "c2pa");

function FieldError({ errors, name }: { errors: FieldErrors; name: string }) {
  if (!errors[name]) return null;
  return <p className="mt-1.5 text-sm font-medium text-heavy">{errors[name]}</p>;
}

function Section({ step, title, intro, children }: { step: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-7">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-display text-sm font-semibold text-accent">{step}</span>
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          {intro && <p className="mt-1 text-sm text-ink-soft">{intro}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function SellForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, publishing] = useActionState(createListing, null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [checking, startChecking] = useTransition();
  const [, startPublishing] = useTransition();
  const [evidenceRows, setEvidenceRows] = useState<number[]>([0]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const nextRow = useRef(1);

  useEffect(() => () => void (coverUrl && URL.revokeObjectURL(coverUrl)), [coverUrl]);

  const errors: FieldErrors = { ...(preview && !preview.ok ? preview.errors : {}), ...(createState?.errors ?? {}) };
  const message = createState?.message ?? (preview && !preview.ok ? preview.message : undefined);

  function check() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startChecking(async () => setPreview(await previewAssessment(data)));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Submitting manually (instead of <form action>) keeps the fields filled
    // in if validation fails.
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startPublishing(() => createAction(data));
  }

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      <div className="space-y-6">
        <Section step="01" title="The work">
          <div>
            <label htmlFor="title" className="label">
              Title
            </label>
            <input id="title" name="title" className="field" maxLength={100} required />
            <FieldError errors={errors} name="title" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="label">
                Category
              </label>
              <select id="category" name="category" className="field" defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <FieldError errors={errors} name="category" />
            </div>
            <div>
              <label htmlFor="price" className="label">
                Price (USD)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input id="price" name="price" inputMode="decimal" className="field pl-7" placeholder="25" />
              </div>
              <p className="hint">Use 0 to give it away.</p>
              <FieldError errors={errors} name="price" />
            </div>
          </div>

          <div>
            <label htmlFor="summary" className="label">
              Short description
            </label>
            <textarea id="summary" name="summary" rows={3} maxLength={280} className="field" />
            <p className="hint">Shown on cards and search results. Up to 280 characters.</p>
            <FieldError errors={errors} name="summary" />
          </div>

          <fieldset>
            <legend className="label">License</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {LICENSES.map((l, i) => (
                <label
                  key={l.id}
                  className="cursor-pointer rounded-xl border border-line p-3 transition-colors hover:border-ink has-checked:border-ink has-checked:bg-paper"
                >
                  <input type="radio" name="license" value={l.id} defaultChecked={i === 0} className="sr-only" />
                  <span className="block text-sm font-semibold">{l.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{l.blurb}</span>
                </label>
              ))}
            </div>
            <FieldError errors={errors} name="license" />
          </fieldset>

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
            <p className="hint">
              For art, photos and design this is the work itself. We read its metadata for generator tags and Content
              Credentials. Upload the original file, not a screenshot.
            </p>
            <FieldError errors={errors} name="cover" />
          </div>
        </Section>

        <Section step="02" title="Content" intro="Both parts are scanned. Only the preview is ever shown publicly.">
          <div>
            <label htmlFor="preview" className="label">
              Public preview
            </label>
            <textarea id="preview" name="preview" rows={8} className="field font-[inherit]" />
            <p className="hint">An excerpt, a stanza, a code sample, the pitch. Anyone can read this.</p>
            <FieldError errors={errors} name="preview" />
          </div>
          <div>
            <label htmlFor="locked" className="label">
              What the buyer gets
            </label>
            <textarea id="locked" name="locked" rows={8} className="field" />
            <p className="hint">The full text or code, or delivery instructions and download links. Unlocked after purchase.</p>
            <FieldError errors={errors} name="locked" />
          </div>
        </Section>

        <Section
          step="03"
          title="AI disclosure"
          intro="Be precise. Your answers set the floor of your score: we never show less AI than you disclose."
        >
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
                    <input type="radio" name={`disclosure_${stage}`} value={level} defaultChecked={level === "none"} className="sr-only" />
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
        </Section>

        <Section
          step="04"
          title="Process evidence"
          intro="Show how you made it. Evidence is public, narrows your score's range and is the best answer to a false flag."
        >
          <div className="space-y-3">
            {evidenceRows.map((row) => (
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
                  onClick={() => setEvidenceRows((rows) => rows.filter((r) => r !== row))}
                  aria-label="Remove evidence"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {evidenceRows.length < MAX_EVIDENCE && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEvidenceRows((rows) => [...rows, nextRow.current++])}
            >
              + Add evidence
            </button>
          )}
          <FieldError errors={errors} name="evidence" />
        </Section>

        <section className="card space-y-4 p-5 sm:p-7">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="attest" className="mt-1 h-4 w-4 accent-[var(--accent)]" />
            <span>
              I made this work and my AI disclosure is accurate. I understand that misrepresenting AI use is grounds for
              removal.
            </span>
          </label>
          <FieldError errors={errors} name="attest" />
          {message && (
            <p role="alert" className="rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink">
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-ghost" onClick={check} disabled={checking}>
              {checking ? "Checking…" : "Check my score"}
            </button>
            <button type="submit" className="btn-accent" disabled={publishing}>
              {publishing ? "Analyzing & publishing…" : "Publish listing"}
            </button>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto">
        {preview?.ok ? (
          <div className="space-y-4">
            <ScoreCard score={preview.result.score} />
            {preview.result.score.needsReview && (
              <p className="rounded-xl border border-assist/40 bg-card p-4 text-sm text-ink-soft">
                This would go to a human reviewer before it appears in the market. Adding process evidence helps the
                review go quickly.
              </p>
            )}
            {preview.result.media && (
              <div className="card p-4 text-sm">
                <span className="eyebrow">Image metadata</span>
                <ul className="mt-2 space-y-1.5 text-ink-soft">
                  {preview.result.media.findings.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.result.segments.length > 0 && (
              <div className="card max-h-[420px] overflow-y-auto p-4">
                <span className="eyebrow mb-3 block">Your preview, passage by passage</span>
                <SegmentView text={preview.result.previewText} segments={preview.result.segments} kind={preview.result.previewKind} />
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6">
            <span className="eyebrow">Your score</span>
            <p className="mt-3 font-display text-2xl font-semibold leading-snug">See your number before anyone else does.</p>
            <p className="mt-2 text-sm text-ink-soft">
              Fill in the form and press <strong>Check my score</strong>. We combine your disclosure, a scan of the work,
              and your evidence. Nothing is saved until you publish.
            </p>
          </div>
        )}
      </aside>
    </form>
  );
}
