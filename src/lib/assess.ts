import { VISUAL_CATEGORIES, type CategoryId } from "./categories";
import { scanImageMetadata, type MediaScan } from "./analysis/media";
import { externalProviders } from "./analysis/providers";
import { analyzeText, combineAnalyses, detectKind, type TextAnalysis } from "./analysis/text";
import type { StoredAnalysis } from "./db/schema";
import { computeScore, METADATA_SOURCE, type Detection, type Disclosure, type Evidence, type Score } from "./scoring";

export interface AssessmentInput {
  category: CategoryId;
  /** Public preview shown to everyone. */
  preview: string;
  /** Deliverable unlocked after purchase. Analyzed, but never shown in results. */
  locked: string;
  image?: Uint8Array | null;
  /**
   * When an edit keeps the image already on a post, the scan made from the
   * original upload. Only the stripped public copy is stored, so the original's
   * metadata can't be read again.
   */
  priorMedia?: MediaScan | null;
  disclosure: Disclosure;
  evidence: Evidence[];
}

export interface Assessment {
  score: Score;
  /** Passage-level results for the public preview only. */
  preview: TextAnalysis | null;
  media: MediaScan | null;
  /** Evidence as submitted plus anything found automatically (e.g. C2PA). */
  evidence: Evidence[];
  sources: string[];
}

export async function assess(input: AssessmentInput): Promise<Assessment> {
  const detections: Detection[] = [];
  const sources: string[] = [];
  const evidence = [...input.evidence];

  const preview = input.preview.trim() ? analyzeText(input.preview, detectKind(input.preview, input.category)) : null;
  const locked = input.locked.trim() ? analyzeText(input.locked, detectKind(input.locked, input.category)) : null;
  const combined = combineAnalyses([preview, locked].filter((a): a is TextAnalysis => a !== null));

  if (combined && combined.confidence > 0) {
    detections.push({ stage: "creation", share: combined.aiShare, confidence: combined.confidence, source: "builtin-text" });
    sources.push(`Built-in style analysis of ${combined.words.toLocaleString("en-US")} words`);
  }

  const fullText = [input.preview, input.locked].filter((t) => t.trim()).join("\n\n");
  for (const provider of externalProviders) {
    if (!provider.analyzeText || !fullText) continue;
    const result = await provider.analyzeText(fullText, preview?.kind ?? "prose").catch(() => null);
    if (result) {
      detections.push({ stage: "creation", ...result, source: provider.id });
      sources.push(provider.label);
    }
  }

  let media: MediaScan | null = null;
  // With no text alongside it, the image is the work whatever the category.
  const imageStage = VISUAL_CATEGORIES.includes(input.category) || !fullText ? "creation" : "assets";
  if (!(input.image && input.image.byteLength > 0) && input.priorMedia) {
    media = input.priorMedia;
    sources.push("Image metadata scan (IPTC, C2PA, EXIF, generator tags), from the original upload");
    if (media.aiSignal === "strong") detections.push({ stage: imageStage, share: 1, confidence: 0.9, source: METADATA_SOURCE });
    if (media.aiSignal === "partial") detections.push({ stage: imageStage, share: 0.5, confidence: 0.8, source: METADATA_SOURCE });
  }
  if (input.image && input.image.byteLength > 0) {
    const stage = imageStage;
    media = scanImageMetadata(input.image);
    sources.push("Image metadata scan (IPTC, C2PA, EXIF, generator tags)");
    if (media.aiSignal === "strong") detections.push({ stage, share: 1, confidence: 0.9, source: METADATA_SOURCE });
    if (media.aiSignal === "partial") detections.push({ stage, share: 0.5, confidence: 0.8, source: METADATA_SOURCE });
    if (media.c2pa && media.aiSignal === "none" && !evidence.some((e) => e.kind === "c2pa")) {
      evidence.push({ kind: "c2pa", note: "Found in the uploaded file (signature not yet verified)" });
    }

    for (const provider of externalProviders) {
      if (!provider.analyzeImage) continue;
      const result = await provider.analyzeImage(input.image).catch(() => null);
      if (result) {
        detections.push({ stage, ...result, source: provider.id });
        sources.push(provider.label);
      }
    }
  }

  const score = computeScore({ category: input.category, disclosure: input.disclosure, evidence, detections });
  return { score, preview, media, evidence, sources };
}

/** The columns a listing or post stores from an assessment. */
export function scoreColumns(result: Assessment) {
  const { score } = result;
  return {
    aiPercent: score.percent,
    aiLow: score.low,
    aiHigh: score.high,
    tier: score.tier,
    processVerified: score.processVerified,
    evidence: result.evidence,
    analysis: {
      score,
      previewSegments: result.preview?.segments ?? [],
      previewKind: result.preview?.kind ?? null,
      signals: result.preview?.signals ?? [],
      media: result.media,
      sources: result.sources,
      analyzedAt: new Date().toISOString(),
    } satisfies StoredAnalysis,
  };
}
