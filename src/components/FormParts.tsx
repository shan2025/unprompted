"use client";

// Form sections shared by the sell form and the journal write form, so the
// disclosure and evidence steps stay identical in both.

import { useEffect, useRef, useState } from "react";
import { MAX_EVIDENCE, MAX_FILES_BYTES, MAX_IMAGE_BYTES, type FieldErrors, type PreviewResult } from "@/lib/listing-form";
import { MAX_PUBLIC_EDGE } from "@/lib/public-image-size";
import { EVIDENCE_KINDS, LEVELS, LEVEL_INFO, STAGES, STAGE_INFO, type Disclosure, type Evidence, type Level } from "@/lib/scoring";
import { COVER_PATTERNS, COVER_THEMES } from "@/lib/cover-themes";
import { Cover } from "./Cover";
import { ScoreCard } from "./Score";
import { SegmentView } from "./SegmentView";

const EVIDENCE_OPTIONS = Object.entries(EVIDENCE_KINDS).filter(([k]) => k !== "c2pa");

/** Caught here: a request this size would be refused before the server could explain why. */
export function filesTooBigMessage(data: FormData) {
  let total = 0;
  for (const value of data.values()) if (value instanceof File) total += value.size;
  if (total <= MAX_FILES_BYTES) return null;
  return `Your image and evidence files add up to ${(total / (1024 * 1024)).toFixed(1)} MB and the limit is 4 MB. Use a smaller file, or link to it instead.`;
}

/** Shrinks a photo in the browser, so one straight from a phone fits the shared limit. */
export async function shrinkImage(file: File, maxEdge = MAX_PUBLIC_EDGE) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas");
  // JPEG has no transparency, and would otherwise turn it black.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("No image");
  return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.jpg`, { type: "image/jpeg" });
}

function EvidenceFileField({ row }: { row: number }) {
  const [problem, setProblem] = useState<string | null>(null);

  async function choose(input: HTMLInputElement) {
    const file = input.files?.[0];
    setProblem(null);
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        if (file.size > MAX_FILES_BYTES) throw new Error(`This PDF is ${(file.size / (1024 * 1024)).toFixed(1)} MB and the limit is 4 MB. Link to it instead.`);
        return;
      }
      if (!file.type.startsWith("image/")) throw new Error("Upload an image or a PDF. For anything else, such as video, paste a link.");
      const smaller = await shrinkImage(file).catch(() => {
        throw new Error("We couldn't read that image. Try exporting it again as a JPG or PNG.");
      });
      const files = new DataTransfer();
      files.items.add(smaller);
      input.files = files.files;
    } catch (e) {
      input.value = "";
      setProblem((e as Error).message);
    }
  }

  return (
    <div>
      <input
        name={`evidence_file_${row}`}
        type="file"
        accept="image/*,application/pdf"
        aria-label="Evidence file from your device"
        className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"
        onChange={(e) => void choose(e.target)}
      />
      {problem && <p className="mt-1.5 text-sm font-medium text-heavy">{problem}</p>}
    </div>
  );
}

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

const SWATCH =
  "block aspect-[4/3] overflow-hidden rounded-lg border border-line transition-[border-color,box-shadow] peer-checked:border-ink peer-checked:shadow-[0_0_0_1px_var(--color-ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2";

/**
 * Picks the pattern and colours of the generated cover shown when there's no
 * image. Every swatch is a small live cover: patterns in the chosen colours,
 * colours in the chosen pattern (or the category's own).
 */
export function CoverThemeField({
  saved,
  savedPattern,
  hint,
}: {
  saved?: string | null;
  savedPattern?: string | null;
  hint: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState("writing");
  const [theme, setTheme] = useState(saved ?? "");
  const [pattern, setPattern] = useState(savedPattern ?? "");
  const shown = pattern || category;

  useEffect(() => {
    const form = ref.current?.closest("form");
    const select = form?.elements.namedItem("category");
    if (!(select instanceof HTMLSelectElement)) return;
    const sync = () => setCategory(select.value || "writing");
    sync();
    select.addEventListener("change", sync);
    return () => select.removeEventListener("change", sync);
  }, []);

  return (
    <div ref={ref} className="space-y-4">
      <fieldset>
        <legend className="label">
          Cover pattern <span className="font-normal text-muted">(used when there&apos;s no image)</span>
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          <label className="flex cursor-pointer flex-col gap-1.5">
            <input type="radio" name="cover_pattern" value="" checked={!pattern} onChange={() => setPattern("")} className="peer sr-only" />
            <span className={SWATCH}>
              <Cover slug="pattern-auto" category={category} theme={theme || "clay"} title="" />
            </span>
            <span className="text-center text-xs text-ink-soft">Match craft</span>
          </label>
          {COVER_PATTERNS.map((p) => (
            <label key={p.id} className="flex cursor-pointer flex-col gap-1.5">
              <input type="radio" name="cover_pattern" value={p.id} checked={pattern === p.id} onChange={() => setPattern(p.id)} className="peer sr-only" />
              <span className={SWATCH}>
                <Cover slug={`pattern-${p.id}`} category={p.id} theme={theme || "clay"} title="" />
              </span>
              <span className="text-center text-xs text-ink-soft">{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Cover colours</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          <label className="flex cursor-pointer flex-col gap-1.5">
            <input type="radio" name="cover_theme" value="" checked={!theme} onChange={() => setTheme("")} className="peer sr-only" />
            <span className={`${SWATCH} flex items-center justify-center border-dashed text-xs text-muted`}>Auto</span>
            <span className="text-center text-xs text-ink-soft">Surprise me</span>
          </label>
          {COVER_THEMES.map((t) => (
            <label key={t.id} className="flex cursor-pointer flex-col gap-1.5">
              <input type="radio" name="cover_theme" value={t.id} checked={theme === t.id} onChange={() => setTheme(t.id)} className="peer sr-only" />
              <span className={SWATCH}>
                <Cover slug={`theme-${t.id}`} category={shown} theme={t.id} title="" />
              </span>
              <span className="text-center text-xs text-ink-soft">{t.label}</span>
            </label>
          ))}
        </div>
        <p className="hint">{hint}</p>
      </fieldset>
    </div>
  );
}

export function ImageField({ errors, hint, currentFile }: { errors: FieldErrors; hint: string; currentFile?: string | null }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  useEffect(() => () => void (coverUrl && URL.revokeObjectURL(coverUrl)), [coverUrl]);
  const showCurrent = currentFile && !coverUrl && !removing;

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
        {showCurrent && (
          // eslint-disable-next-line @next/next/no-img-element -- the image already on the post
          <img src={`/api/files/${currentFile}`} alt="Current image" className="h-16 w-20 rounded-lg border border-line object-cover" />
        )}
        <input
          id="cover"
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"
          onChange={(e) => {
            const f = e.target.files?.[0];
            // Caught here: a file this size would be refused before the server could explain why.
            if (f && f.size > MAX_IMAGE_BYTES) {
              setTooBig(`This image is ${(f.size / (1024 * 1024)).toFixed(1)} MB and the limit is 4 MB. Export a smaller copy and try again.`);
              setCoverUrl(null);
              e.target.value = "";
              return;
            }
            setTooBig(null);
            setCoverUrl(f ? URL.createObjectURL(f) : null);
          }}
        />
      </div>
      <p className="hint">{currentFile ? `Choosing a new file replaces the current image. ${hint}` : hint}</p>
      {currentFile && !coverUrl && (
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="remove_cover"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={removing}
            onChange={(e) => setRemoving(e.target.checked)}
          />
          Remove the current image
        </label>
      )}
      {tooBig && <p className="mt-1.5 text-sm font-medium text-heavy">{tooBig}</p>}
      <FieldError errors={errors} name="cover" />
    </div>
  );
}

export function DisclosureFields({
  errors,
  defaultAi,
  saved,
  savedNotes,
}: {
  errors: FieldErrors;
  defaultAi?: Level;
  /** On an edit, the answers given last time. */
  saved?: Disclosure;
  savedNotes?: string;
}) {
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
                {/* Nothing is picked for the creator: an honest disclosure has to be an
                    answer, not a default. Only the making stage is filled in, and only
                    from what they told us on /start. */}
                <input
                  type="radio"
                  name={`disclosure_${stage}`}
                  value={level}
                  defaultChecked={saved ? saved[stage] === level : stage === "creation" && level === defaultAi}
                  className="sr-only"
                />
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
          defaultValue={savedNotes}
          className="field"
          placeholder="e.g. I used a grammar checker on the final draft. Everything else is mine."
        />
        <FieldError errors={errors} name="aiNotes" />
      </div>
    </>
  );
}

export function EvidenceFields({ errors, saved = [] }: { errors: FieldErrors; saved?: (Evidence & { index: number })[] }) {
  const [rows, setRows] = useState<number[]>(saved.length ? [] : [0]);
  const nextRow = useRef(1);
  const [keep, setKeep] = useState(() => new Set(saved.map((e) => e.index)));

  return (
    <>
      {saved.length > 0 && (
        <ul className="space-y-2" aria-label="Evidence already on this post">
          {saved.map((e) => (
            <li key={e.index} className="flex items-start gap-3 rounded-xl border border-line p-3">
              <input
                type="checkbox"
                name="keep_evidence"
                value={e.index}
                checked={keep.has(e.index)}
                onChange={(ev) =>
                  setKeep((k) => {
                    const next = new Set(k);
                    if (ev.target.checked) next.add(e.index);
                    else next.delete(e.index);
                    return next;
                  })
                }
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
                aria-label={`Keep ${EVIDENCE_KINDS[e.kind]?.label ?? e.kind}`}
              />
              <div className={`min-w-0 flex-1 text-sm ${keep.has(e.index) ? "" : "opacity-50 line-through"}`}>
                <p className="font-semibold">{EVIDENCE_KINDS[e.kind]?.label ?? e.kind}</p>
                {e.url && <p className="break-all text-ink-soft">{e.url}</p>}
                {e.file && <p className="text-ink-soft">{e.file.endsWith(".pdf") ? "PDF" : "Image"} uploaded</p>}
                {e.note && <p className="text-muted">{e.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {saved.length > 0 && <p className="hint">Untick anything you want to take off. Add more below.</p>}
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
              <input type="hidden" name="evidence_row" value={row} />
              <EvidenceFileField row={row} />
              <input name="evidence_url" className="field" placeholder="Or paste a link (repo, video, drive folder)" aria-label="Evidence link" />
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
      <p className="hint">
        Only evidence with a file or link counts towards your score, so people have something to check. Upload images or PDFs: anyone can open
        them, and they share a 4 MB limit with your image (photos are shrunk to fit). For video, paste a link.
      </p>
      {rows.length + keep.size < MAX_EVIDENCE && (
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
