import { isCategory, isLicense, type CategoryId, type LicenseId } from "./categories";
import { sniffImageType } from "./analysis/media";
import type { MediaScan } from "./analysis/media";
import type { ContentKind, Segment } from "./analysis/text";
import { EVIDENCE_KINDS, LEVELS, STAGES, type Disclosure, type Evidence, type EvidenceKind, type Level, type Score } from "./scoring";

// Stays under the 4.5 MB request limit on Vercel.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_EVIDENCE = 6;

export type FieldErrors = Partial<Record<string, string>>;

export interface ParsedListing {
  title: string;
  category: CategoryId;
  summary: string;
  preview: string;
  locked: string;
  priceCents: number;
  license: LicenseId;
  aiNotes: string;
  disclosure: Disclosure;
  evidence: Evidence[];
  image: { bytes: Uint8Array; ext: "jpg" | "png" | "webp" | "gif" } | null;
}

export interface PreviewResult {
  score: Score;
  previewText: string;
  previewKind: ContentKind | null;
  segments: Segment[];
  signals: string[];
  media: MediaScan | null;
  sources: string[];
}

export type PreviewState = { ok: true; result: PreviewResult } | { ok: false; errors: FieldErrors; message?: string };
export type CreateState = { errors?: FieldErrors; message?: string } | null;

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function parseListingForm(fd: FormData, { requireAttestation }: { requireAttestation: boolean }) {
  const errors: FieldErrors = {};

  const title = str(fd, "title");
  if (title.length < 3 || title.length > 100) errors.title = "Use 3 to 100 characters.";

  const category = str(fd, "category");
  if (!isCategory(category)) errors.category = "Pick a category.";

  const summary = str(fd, "summary");
  if (summary.length < 10 || summary.length > 280) errors.summary = "Use 10 to 280 characters.";

  const preview = str(fd, "preview");
  if (preview.length > 20_000) errors.preview = "Keep the preview under 20,000 characters.";

  const locked = str(fd, "locked");
  if (locked.length > 50_000) errors.locked = "Keep this under 50,000 characters.";

  const aiNotes = str(fd, "aiNotes");
  if (aiNotes.length > 1000) errors.aiNotes = "Keep this under 1,000 characters.";

  const priceText = str(fd, "price").replace(/^\$/, "");
  const price = Number(priceText);
  if (priceText === "" || !Number.isFinite(price) || price < 0 || price > 10_000) {
    errors.price = "Enter a price from 0 to 10,000.";
  }

  const license = str(fd, "license");
  if (!isLicense(license)) errors.license = "Pick a license.";

  const disclosure = {} as Disclosure;
  for (const stage of STAGES) {
    const level = str(fd, `disclosure_${stage}`);
    if (!(LEVELS as readonly string[]).includes(level)) errors.disclosure = "Answer every stage of the AI disclosure.";
    disclosure[stage] = (level || "none") as Level;
  }

  const kinds = fd.getAll("evidence_kind").map(String);
  const urls = fd.getAll("evidence_url").map((v) => String(v).trim());
  const notes = fd.getAll("evidence_note").map((v) => String(v).trim());
  const evidence: Evidence[] = [];
  kinds.forEach((kind, i) => {
    const url = urls[i] ?? "";
    const note = (notes[i] ?? "").slice(0, 300);
    if (!url && !note) return;
    if (!(kind in EVIDENCE_KINDS) || kind === "c2pa") {
      errors.evidence = "Choose what each piece of evidence is.";
      return;
    }
    if (url && !/^https?:\/\/\S+\.\S+/.test(url)) {
      errors.evidence = "Evidence links must start with http:// or https://";
      return;
    }
    evidence.push({ kind: kind as EvidenceKind, ...(url && { url }), ...(note && { note }) });
  });
  if (evidence.length > MAX_EVIDENCE) errors.evidence = `Attach at most ${MAX_EVIDENCE} pieces of evidence.`;

  let image: ParsedListing["image"] = null;
  const file = fd.get("cover");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) {
      errors.cover = "Images must be 4 MB or smaller.";
    } else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = sniffImageType(bytes);
      if (!ext) errors.cover = "Upload a JPG, PNG, WebP or GIF.";
      else image = { bytes, ext };
    }
  }

  if (!preview && !locked && !image && !errors.cover) {
    errors.preview = "Add a preview, the deliverable, or an image so there is something to show and check.";
  }

  if (requireAttestation && fd.get("attest") !== "on") {
    errors.attest = "Please confirm your disclosure is accurate.";
  }

  if (Object.keys(errors).length) return { errors };

  const values: ParsedListing = {
    title,
    category: category as CategoryId,
    summary,
    preview,
    locked,
    priceCents: Math.round(price * 100),
    license: license as LicenseId,
    aiNotes,
    disclosure,
    evidence,
    image,
  };
  return { values };
}
