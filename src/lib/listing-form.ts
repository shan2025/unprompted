import { isLicense, type CategoryId, type LicenseId } from "./categories";
import { parseProductPhotos, type ProductPhoto, type SavedPhoto } from "./product-photos";
import { productType } from "./product-types";
import { evidenceUrl, hasDuplicateEvidence } from "./evidence";
import { CURRENCIES, isCurrency, listingPrice, type Currency } from "./currency";
import { sniffImageType } from "./analysis/media";
import type { MediaScan } from "./analysis/media";
import type { ContentKind, Segment } from "./analysis/text";
import { PAYMENT_LINK_HELP, parsePaymentLink } from "./payment-link";
import { EVIDENCE_KINDS, LEVELS, STAGES, type Disclosure, type Evidence, type EvidenceKind, type Level, type Score } from "./scoring";

// Stays under the 4.5 MB request limit on Vercel.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** The cover and evidence files travel in one request, so they share this limit. */
export const MAX_FILES_BYTES = MAX_IMAGE_BYTES;
export const MAX_EVIDENCE = 6;
export const UNREADABLE_IMAGE = "We couldn't read that image. Try exporting it again as a JPG or PNG.";
export const UNREADABLE_EVIDENCE = "We couldn't read one of your evidence images. Try exporting it again as a JPG or PNG.";
/** Stands in for an evidence file's name until it's saved at publish, so the score counts it. */
const UNSAVED_FILE = "unsaved";

export type FieldErrors = Partial<Record<string, string>>;

export interface EvidenceFile {
  /** Position of the evidence item this file belongs to. */
  index: number;
  bytes: Uint8Array;
  pdf: boolean;
}

export interface ParsedListing {
  title: string;
  category: CategoryId;
  productType: string;
  photos: ProductPhoto[];
  summary: string;
  preview: string;
  locked: string;
  priceCents: number;
  currency: Currency;
  paymentUrl: string | null;
  license: LicenseId | "physical";
  aiNotes: string;
  disclosure: Disclosure;
  evidence: Evidence[];
  evidenceFiles: EvidenceFile[];
  image: { bytes: Uint8Array } | null;
}

export interface EditableListing extends Omit<ParsedListing, "image" | "evidenceFiles" | "evidence" | "photos" | "productType"> {
  productType: string | null;
  gallery: SavedPhoto[];
  slug: string;
  workVersion: string;
  coverFile: string | null;
  coverTheme: string | null;
  coverPattern: string | null;
  evidence: (Evidence & { index: number })[];
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

export type ParsedImage = ParsedListing["image"];

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// The disclosure, evidence and image fields are shared by listings and
// journal posts. Each parser records problems in `errors`.

export function parseDisclosure(fd: FormData, errors: FieldErrors) {
  const disclosure = {} as Disclosure;
  for (const stage of STAGES) {
    const level = str(fd, `disclosure_${stage}`);
    if (!(LEVELS as readonly string[]).includes(level)) errors.disclosure = "Answer every stage of the AI disclosure.";
    disclosure[stage] = (level || "none") as Level;
  }
  return disclosure;
}

export function isPdf(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
}

export async function parseEvidence(fd: FormData, errors: FieldErrors) {
  const kinds = fd.getAll("evidence_kind").map(String);
  const rows = fd.getAll("evidence_row").map(String);
  const urls = fd.getAll("evidence_url").map((v) => String(v).trim());
  const notes = fd.getAll("evidence_note").map((v) => String(v).trim());
  const evidence: Evidence[] = [];
  const files: EvidenceFile[] = [];
  for (const [i, kind] of kinds.entries()) {
    const url = urls[i] ?? "";
    const note = (notes[i] ?? "").slice(0, 300);
    // Named by row, because a row with no file can't be relied on to keep its place in a list.
    const upload = fd.get(`evidence_file_${rows[i]}`);
    const file = upload instanceof File && upload.size > 0 ? upload : null;
    if (!url && !note && !file) continue;
    if (!Object.hasOwn(EVIDENCE_KINDS, kind) || kind === "c2pa") {
      errors.evidence = "Choose what each piece of evidence is.";
      continue;
    }
    if (url && !evidenceUrl(url)) {
      errors.evidence = "Evidence links must start with http:// or https://";
      continue;
    }
    let fingerprint: string | undefined;
    if (file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
      const pdf = isPdf(bytes);
      if (!pdf && !sniffImageType(bytes)) {
        errors.evidence = "Evidence files must be a JPG, PNG, WebP, GIF or PDF.";
        continue;
      }
      files.push({ index: evidence.length, bytes, pdf });
    }
    evidence.push({ kind: kind as EvidenceKind, ...(url && { url }), ...(file && { file: UNSAVED_FILE, fingerprint }), ...(note && { note }) });
  }
  if (evidence.length > MAX_EVIDENCE) errors.evidence = `Attach at most ${MAX_EVIDENCE} pieces of evidence.`;
  if (hasDuplicateEvidence(evidence)) errors.evidence = "Each evidence source must be different. Remove repeated links or files.";
  return { evidence, files };
}

export async function parseImage(fd: FormData, errors: FieldErrors): Promise<ParsedImage> {
  const file = fd.get("cover");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) {
    errors.cover = "Images must be 4 MB or smaller.";
    return null;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImageType(bytes)) {
    errors.cover = "Upload a JPG, PNG, WebP or GIF.";
    return null;
  }
  return { bytes };
}

export async function parseListingForm(fd: FormData, { requireAttestation, keepsImage = false, savedPhotos = [], gatewayCheckout = false, paymentLinkOptional = false }: { requireAttestation: boolean; keepsImage?: boolean; savedPhotos?: SavedPhoto[]; /** Buyers pay through Cashfree, so no payment link is needed. */ gatewayCheckout?: boolean; /** The company can sell by enquiry instead of a payment link. */ paymentLinkOptional?: boolean }) {
  const errors: FieldErrors = {};

  const title = str(fd, "title");
  if (title.length < 3 || title.length > 100) errors.title = "Use 3 to 100 characters.";

  const product = productType(str(fd, "category"));
  if (!product) errors.category = "Pick a product type.";

  const summary = str(fd, "summary");
  if (summary.length < 10 || summary.length > 280) errors.summary = "Use 10 to 280 characters.";

  const preview = str(fd, "preview");
  if (preview.length > 20_000) errors.preview = "Keep the preview under 20,000 characters.";

  const locked = str(fd, "locked");
  if (locked.length > 50_000) errors.locked = "Keep this under 50,000 characters.";

  const aiNotes = str(fd, "aiNotes");
  if (aiNotes.length > 1000) errors.aiNotes = "Keep this under 1,000 characters.";

  const currencyText = str(fd, "currency");
  if (!isCurrency(currencyText)) errors.currency = "Pick a currency.";
  const currency: Currency = isCurrency(currencyText) ? currencyText : "USD";
  const max = CURRENCIES[currency].max;

  // People type "1,500" or "₹1500"; both mean 1500.
  const price = listingPrice(str(fd, "price"));
  if (!Number.isFinite(price) || price < 0 || price > max) {
    errors.price = `Enter a price from 0 to ${max.toLocaleString("en-US")}.`;
  }

  const paymentLink = str(fd, "paymentUrl");
  const paymentUrl = paymentLink ? parsePaymentLink(paymentLink) : null;
  if (paymentLink && !paymentUrl) errors.paymentUrl = PAYMENT_LINK_HELP;
  // Only needed to publish, so a score can be checked before the link is ready.
  else if (requireAttestation && !paymentLink && price > 0 && !gatewayCheckout && !paymentLinkOptional) errors.paymentUrl = "Add a payment link so buyers can pay you.";

  const license = product?.physical ? "physical" : str(fd, "license");
  if (product && !product.physical && !isLicense(license)) errors.license = "Pick a license.";

  const disclosure = parseDisclosure(fd, errors);
  const { evidence, files: evidenceFiles } = await parseEvidence(fd, errors);
  const photos = await parseProductPhotos(fd, savedPhotos, errors);
  const first = photos[0];
  const image = first && "bytes" in first ? { bytes: first.bytes } : null;

  if (!preview && !locked && !keepsImage && !photos.length && !errors.gallery && !errors.cover) {
    errors.preview = product?.physical
      ? "Add a product photo, more product details, or delivery instructions."
      : "Add a preview, the deliverable, or an image so there is something to show and check.";
  }

  if (requireAttestation && fd.get("attest") !== "on") {
    errors.attest = "Please confirm your disclosure is accurate.";
  }

  if (Object.keys(errors).length) return { errors };

  const values: ParsedListing = {
    title,
    category: product!.craft,
    productType: product!.id,
    photos,
    summary,
    preview,
    locked,
    priceCents: Math.round(price * 100),
    currency,
    paymentUrl: price > 0 ? paymentUrl : null,
    license: license as ParsedListing["license"],
    aiNotes,
    disclosure,
    evidence,
    evidenceFiles,
    image,
  };
  return { values };
}
