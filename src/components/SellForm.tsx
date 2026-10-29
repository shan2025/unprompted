"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createListing, previewAssessment } from "@/app/actions/listings";
import { CATEGORIES, LICENSES } from "@/lib/categories";
import type { FieldErrors, PreviewState } from "@/lib/listing-form";
import type { Level } from "@/lib/scoring";
import { DisclosureFields, EvidenceFields, FieldError, ImageField, ScorePreview, Section } from "./FormParts";

export function SellForm({ defaultCategory, defaultAi }: { defaultCategory?: string; defaultAi?: Level }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, publishing] = useActionState(createListing, null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [checking, startChecking] = useTransition();
  const [, startPublishing] = useTransition();

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
              <select id="category" name="category" className="field" defaultValue={defaultCategory ?? ""}>
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

          <ImageField
            errors={errors}
            hint="For art, photos and design this is the work itself. We read its metadata for generator tags and Content Credentials. Upload the original file, not a screenshot."
          />
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
          <DisclosureFields errors={errors} defaultAi={defaultAi} />
        </Section>

        <Section
          step="04"
          title="Process evidence"
          intro="Show how you made it. Evidence is public, narrows your score's range and is the best answer to a false flag."
        >
          <EvidenceFields errors={errors} />
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

      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto no-scrollbar">
        <ScorePreview
          result={preview?.ok ? preview.result : null}
          reviewNote="This would go to a human reviewer before it appears in the market. Adding process evidence helps the review go quickly."
          segmentsLabel="Your preview, passage by passage"
        />
      </aside>
    </form>
  );
}
