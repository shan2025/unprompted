"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createPost, previewPostAssessment } from "@/app/actions/posts";
import { CATEGORIES } from "@/lib/categories";
import type { FieldErrors } from "@/lib/listing-form";
import type { PostPreviewState } from "@/lib/post-form";
import { DisclosureFields, EvidenceFields, FieldError, ImageField, ScorePreview, Section } from "./FormParts";

export function PostForm({ defaultCategory }: { defaultCategory?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, publishing] = useActionState(createPost, null);
  const [preview, setPreview] = useState<PostPreviewState | null>(null);
  const [checking, startChecking] = useTransition();
  const [, startPublishing] = useTransition();

  const errors: FieldErrors = { ...(preview && !preview.ok ? preview.errors : {}), ...(createState?.errors ?? {}) };
  const message = createState?.message ?? (preview && !preview.ok ? preview.message : undefined);

  function check() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    startChecking(async () => setPreview(await previewPostAssessment(data)));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Submitting manually keeps the fields filled in if validation fails.
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startPublishing(() => createAction(data));
  }

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      <div className="space-y-6">
        <Section step="01" title="Your post">
          <div>
            <label htmlFor="title" className="label">
              Title
            </label>
            <input id="title" name="title" className="field" maxLength={100} required />
            <FieldError errors={errors} name="title" />
          </div>

          <div>
            <label htmlFor="category" className="label">
              Category
            </label>
            <select id="category" name="category" className="field sm:max-w-xs" defaultValue={defaultCategory ?? ""}>
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
            <label htmlFor="body" className="label">
              Write
            </label>
            <textarea id="body" name="body" rows={16} className="field text-[16px] leading-relaxed" />
            <p className="hint">An article, a poem, a process note, an idea. Blank lines start new paragraphs.</p>
            <FieldError errors={errors} name="body" />
          </div>

          <ImageField
            errors={errors}
            hint="A photo of the work, a sketch, or a cover. For art and photography, upload the original file: we read its metadata for generator tags and Content Credentials."
          />
        </Section>

        <Section
          step="02"
          title="AI disclosure"
          intro="Same standard as the market. Your answers set the floor of your score: we never show less AI than you disclose."
        >
          <DisclosureFields errors={errors} />
        </Section>

        <Section
          step="03"
          title="Process evidence"
          intro="Optional, but it narrows your score's range and is the best answer to a false flag."
        >
          <EvidenceFields errors={errors} />
        </Section>

        <section className="card space-y-4 p-5 sm:p-7">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="attest" className="mt-1 h-4 w-4 accent-[var(--accent)]" />
            <span>
              I made this and my AI disclosure is accurate. I understand that misrepresenting AI use is grounds for removal.
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
              {publishing ? "Analyzing & publishing…" : "Publish post"}
            </button>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto no-scrollbar">
        <ScorePreview
          result={preview?.ok ? preview.result : null}
          reviewNote="This would go to a human reviewer before it appears in the Journal. Adding process evidence helps the review go quickly."
          segmentsLabel="Your post, passage by passage"
        />
      </aside>
    </form>
  );
}
