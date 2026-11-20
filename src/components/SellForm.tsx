"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { createListing, previewAssessment, updateListing } from "@/app/actions/listings";
import { useDraftWorkspace } from "./DraftWorkspace";
import { LICENSES } from "@/lib/categories";
import { PRODUCTS, productType } from "@/lib/product-types";
import { ProductPhotos } from "./ProductPhotos";
import { CURRENCIES, FORM_CURRENCY, listingPrice, type Currency } from "@/lib/currency";
import type { EditableListing, FieldErrors, PreviewState } from "@/lib/listing-form";
import { LEVELS, LEVEL_INFO, STAGES, STAGE_INFO, type Level } from "@/lib/scoring";
import { EvidenceFields, FieldError, filesTooBigMessage, ScorePreview, Section } from "./FormParts";

export function SellForm({ defaultCategory, defaultAi, listing }: { defaultCategory?: string; defaultAi?: Level; listing?: EditableListing }) {
  const draft = useDraftWorkspace();
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createAction, publishing] = useActionState(async (previous: Parameters<typeof createListing>[0], form: FormData) => {
    try { return await (listing ? updateListing : createListing)(previous, form); } finally { draft?.resume(); }
  }, null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [checking, startChecking] = useTransition();
  const [, startPublishing] = useTransition();
  const [tooBig, setTooBig] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>((draft?.value("currency") as Currency) ?? listing?.currency ?? FORM_CURRENCY);
  const [price, setPrice] = useState(draft?.value("price") ?? (listing ? String(listing.priceCents / 100) : ""));
  const paid = listingPrice(price) > 0;
  const [product, setProduct] = useState(draft?.value("category") ?? listing?.productType ?? listing?.category ?? defaultCategory ?? "");
  const physical = productType(product)?.physical;

  const errors: FieldErrors = { ...(preview && !preview.ok ? preview.errors : {}), ...(createState?.errors ?? {}) };
  const message = tooBig ?? createState?.message ?? (preview && !preview.ok ? preview.message : undefined);

  const savedPreview = draft?.value("preview") ?? listing?.preview ?? "";
  const savedDelivery = draft?.value("locked") ?? listing?.locked ?? "";
  const savedNotes = draft?.value("aiNotes") ?? listing?.aiNotes ?? "";
  const hasEvidence = Boolean(listing?.evidence.length || draft?.initial.files.some(([key]) => key.startsWith("evidence_file_"))
    || draft?.initial.fields.some(([key, value]) => ["evidence_url", "evidence_note"].includes(key) && value.trim()));

  function fitsLimit(data: FormData) {
    const problem = filesTooBigMessage(data);
    setTooBig(problem);
    return !problem;
  }

  function check() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    if (!fitsLimit(data)) return;
    startChecking(async () => setPreview(await previewAssessment(data)));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Submitting manually (instead of <form action>) keeps the fields filled
    // in if validation fails.
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!fitsLimit(data)) return;
    startPublishing(async () => {
      if (draft && !(await draft.prepare(data))) return;
      createAction(data);
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-6" noValidate>
      <div className="space-y-6">
        {listing && <>
          <input type="hidden" name="editSlug" value={listing.slug} />
          <input type="hidden" name="workVersion" defaultValue={draft?.value("workVersion") ?? listing.workVersion} />
        </>}
        <Section step="01" title="Your product">
          <div>
            <label htmlFor="title" className="label">
              Title
            </label>
            <input id="title" name="title" className="field" maxLength={100} required defaultValue={listing?.title} />
            <FieldError errors={errors} name="title" />
          </div>

          <ProductPhotos listing={listing} errors={errors} />

          <div>
            <label htmlFor="category" className="label">
              Product type
            </label>
            <select id="category" name="category" className="field" value={product} onChange={e => setProduct(e.target.value)}>
              <option value="" disabled>
                Choose one
              </option>
              <optgroup label="Merchandise">{PRODUCTS.filter(p => p.physical).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
              <optgroup label="Creative products">{PRODUCTS.filter(p => !p.physical).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>
            </select>
            <FieldError errors={errors} name="category" />
          </div>

          <div>
            <label htmlFor="summary" className="label">
              Description
            </label>
            <textarea id="summary" name="summary" rows={3} maxLength={280} className="field" defaultValue={listing?.summary} />
            <p className="hint">{physical ? "Include sizes, materials or colours." : "Tell buyers what they’ll receive."} Up to 280 characters.</p>
            <FieldError errors={errors} name="summary" />
          </div>

          <input type="hidden" name="cover_theme" value={draft?.value("cover_theme") ?? listing?.coverTheme ?? ""} />
          <input type="hidden" name="cover_pattern" value={draft?.value("cover_pattern") ?? listing?.coverPattern ?? ""} />
        </Section>

        <Section step="02" title="Sale details">
          <div>
            <label htmlFor="price" className="label">
              Price
            </label>
            <div className="flex gap-2">
              <select
                id="currency"
                name="currency"
                aria-label="Currency"
                className="field w-[108px] shrink-0"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {Object.entries(CURRENCIES).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{CURRENCIES[currency].symbol}</span>
                <input id="price" name="price" inputMode="decimal" className="field pl-7" placeholder={currency === "INR" ? "500" : "25"} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <p className="hint">Enter 0 for a free listing.</p>
            <FieldError errors={errors} name="currency" />
            <FieldError errors={errors} name="price" />
          </div>

          <div hidden={!paid}>
            <label htmlFor="paymentUrl" className="label">
              Payment link
            </label>
            <input id="paymentUrl" name="paymentUrl" disabled={!paid} className="field" placeholder="https://rzp.io/… or upi://pay?pa=…" defaultValue={draft?.value("paymentUrl") ?? listing?.paymentUrl ?? ""} />
            <p className="hint">
              Use a payment link that charges the amount and currency above.
            </p>
            <FieldError errors={errors} name="paymentUrl" />
          </div>

          <div hidden={!product || physical}>
            <label htmlFor="license" className="label">License</label>
            <select id="license" name="license" className="field" disabled={!product || physical}
              defaultValue={draft?.value("license") ?? (listing?.license === "physical" ? "personal" : listing?.license) ?? "personal"}>
              {LICENSES.map(license => <option key={license.id} value={license.id}>{license.label} — {license.blurb}</option>)}
            </select>
            <FieldError errors={errors} name="license" />
          </div>

          <details hidden={!product && !savedPreview && !savedDelivery && !errors.preview && !errors.locked}
            open={Boolean(savedPreview || savedDelivery || errors.preview || errors.locked) || (!!product && !physical)}
            className="border-t border-line pt-4">
            <summary className="cursor-pointer font-semibold">{physical ? "Additional product and delivery details (optional)" : "Preview and buyer access"}</summary>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="preview" className="label">{physical ? "More product details" : "Public preview"}</label>
                <textarea id="preview" name="preview" rows={3} className="field" defaultValue={savedPreview} />
                <p className="hint">{physical ? "Add a size guide, dimensions or shipping information if buyers need it." : "Share a sample buyers can see before purchase."}</p>
                <FieldError errors={errors} name="preview" />
              </div>
              <div>
                <label htmlFor="locked" className="label">{physical ? "Delivery instructions" : "What the buyer gets"}</label>
                <textarea id="locked" name="locked" rows={3} className="field" defaultValue={savedDelivery} />
                <p className="hint">{physical ? "Private shipping or pickup instructions, shown after purchase." : "Add the full work, a download link or instructions. Buyers get access after purchase."}</p>
                <FieldError errors={errors} name="locked" />
              </div>
            </div>
          </details>
        </Section>

        <Section step="03" title="AI disclosure">
          <ListingDisclosure listing={listing} defaultAi={defaultAi} errors={errors} />
          <details open={Boolean(savedNotes || hasEvidence || errors.aiNotes || errors.evidence)} className="border-t border-line pt-4">
            <summary className="cursor-pointer font-semibold">Process notes and evidence (optional)</summary>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="label">How you made it</span>
                <textarea name="aiNotes" rows={2} maxLength={1000} className="field" defaultValue={savedNotes}/>
              </label>
              <FieldError errors={errors} name="aiNotes" />
              <EvidenceFields errors={errors} saved={listing?.evidence} />
            </div>
          </details>
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
              {publishing ? "Saving & assessing…" : listing ? "Save and resubmit" : "Publish listing"}
            </button>
          </div>
        </section>
      </div>

      {preview?.ok && <aside aria-label="Your score">
        <ScorePreview
          result={preview.result}
          reviewNote="This would go to a human reviewer before it appears in the market. Adding process evidence helps the review go quickly."
          segmentsLabel="Your preview, passage by passage"
        />
      </aside>}
    </form>
  );
}

function ListingDisclosure({ listing, defaultAi, errors }: { listing?: EditableListing; defaultAi?: Level; errors: FieldErrors }) {
  const draft = useDraftWorkspace();
  const saved = STAGES.map(stage => draft?.value(`disclosure_${stage}`) ?? listing?.disclosure[stage]
    ?? (stage === "creation" ? defaultAi : "") ?? "");
  const [mode, setMode] = useState(() => {
    const choice = draft?.value("disclosure_mode");
    if (choice !== undefined) return choice;
    if (saved.every(value => value === "none")) return "none";
    return saved.some(Boolean) ? "stages" : "";
  });
  return <>
    <label className="block">
      <span className="label">AI use</span>
      <select className="field" name="disclosure_mode" value={mode} onChange={e => setMode(e.target.value)} required>
        <option value="" disabled>Choose one</option>
        <option value="none">No AI at any stage</option>
        <option value="stages">Describe AI use by stage</option>
      </select>
    </label>
    <fieldset hidden={mode !== "stages"} disabled={mode !== "stages"} className="grid gap-4 sm:grid-cols-2">
      <legend className="sr-only">AI use by stage</legend>
      {STAGES.map((stage, index) => (
        <label key={stage} className="block">
          <span className="label">{STAGE_INFO[stage].label}</span>
          <select className="field" name={`disclosure_${stage}`} required defaultValue={saved[index]}>
            <option value="" disabled>Choose level of use</option>
            {LEVELS.map(level => <option key={level} value={level}>{LEVEL_INFO[level].label}</option>)}
          </select>
        </label>
      ))}
    </fieldset>
    {mode === "none" && STAGES.map(stage => <input key={stage} type="hidden" name={`disclosure_${stage}`} value="none" />)}
    {errors.disclosure && <p className="mt-1.5 text-sm font-medium text-heavy">{mode ? errors.disclosure : "Choose how AI was used."}</p>}
  </>;
}
