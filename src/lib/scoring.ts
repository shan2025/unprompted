import { STAGE_WEIGHTS, type CategoryId } from "./categories";

// An uncalibrated disclosure-and-signal score. The disclosure is a floor.
// Evidence is displayed and reviewed separately; it never discounts detections.
// low/high remain for historic storage compatibility and are not confidence bounds.

export const STAGES = ["ideation", "creation", "refinement", "assets"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_INFO: Record<Stage, { label: string; hint: string }> = {
  ideation: { label: "Idea & concept", hint: "Coming up with what to make, research, outlining" },
  creation: { label: "Making it", hint: "Writing, coding, drawing, composing, shooting" },
  refinement: { label: "Editing & polish", hint: "Revising, fixing, retouching, mixing" },
  assets: { label: "Supporting assets", hint: "Cover images, descriptions, sample data, extras" },
};

export const LEVELS = ["none", "light", "substantial", "generated"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_INFO: Record<Level, { label: string; hint: string; value: number }> = {
  none: { label: "No AI", hint: "Spellcheck and basic grammar tools are fine", value: 0 },
  light: { label: "Light help", hint: "AI suggested or checked; I made every creative choice", value: 0.15 },
  substantial: { label: "Substantial", hint: "AI produced parts that I edited and kept", value: 0.5 },
  generated: { label: "Generated", hint: "AI produced this; I directed it", value: 1 },
};

export type Disclosure = Record<Stage, Level>;

export const EVIDENCE_KINDS = {
  drafts: { label: "Early drafts", strength: 0.25 },
  timelapse: { label: "Time-lapse or screen recording", strength: 0.35 },
  "version-history": { label: "Version history (commits, doc history)", strength: 0.3 },
  sketches: { label: "Sketches, raw files or project files", strength: 0.25 },
  recording: { label: "Live stream or video of the process", strength: 0.35 },
  c2pa: { label: "Content Credentials (C2PA) in the file", strength: 0.35 },
  other: { label: "Other", strength: 0.1 },
} as const;

export type EvidenceKind = keyof typeof EVIDENCE_KINDS;

export interface Evidence {
  kind: EvidenceKind;
  url?: string;
  /** Name of a file uploaded from the creator's device, served from /api/files. */
  file?: string;
  note?: string;
  /** SHA-256 of the original attachment, set by the server parser. */
  fingerprint?: string;
}

export interface Detection {
  stage: Stage;
  /** Share of that stage's output that looks machine-made, 0-1. */
  share: number;
  confidence: number;
  source: string;
}

export type Tier = "human-made" | "human-led" | "ai-assisted" | "ai-heavy";

export const TIER_INFO: Record<Tier, { label: string; range: string; blurb: string }> = {
  "human-made": { label: "Human-made", range: "0–5%", blurb: "Made by a person, start to finish." },
  "human-led": { label: "Human-led", range: "6–20%", blurb: "A person made it; AI helped around the edges." },
  "ai-assisted": { label: "AI-assisted", range: "21–50%", blurb: "Real human authorship with meaningful AI help." },
  "ai-heavy": { label: "AI-heavy", range: "51%+", blurb: "Mostly machine-made. Not accepted for new listings." },
};

/** Listings disclosing more AI than this are not accepted. */
export const MAX_DISCLOSED = 0.5;
/** Detector disagreement (in weighted points) that sends a listing to review. */
export const REVIEW_THRESHOLD = 0.12;
/** Detection source for what a file says about itself, such as a generator tag. */
export const METADATA_SOURCE = "metadata";

export interface StageScore {
  stage: Stage;
  weight: number;
  disclosed: number;
  detected: number | null;
  effective: number;
}

export interface Score {
  version?: number;
  percent: number;
  low: number;
  high: number;
  disclosedPercent: number;
  tier: Tier;
  evidenceStrength: number;
  processVerified: boolean;
  discrepancy: number;
  needsReview: boolean;
  blocked: boolean;
  stages: StageScore[];
  notes: string[];
}

export function evidenceStrength(evidence: Evidence[]) {
  // Attachments are not a measurement of authorship. Until calibrated evidence
  // exists, even a human review does not change the numeric estimate.
  void evidence;
  return 0;
}

export function tierFor(percent: number): Tier {
  if (percent <= 5) return "human-made";
  if (percent <= 20) return "human-led";
  if (percent <= 50) return "ai-assisted";
  return "ai-heavy";
}

export function computeScore(input: {
  category: CategoryId;
  disclosure: Disclosure;
  evidence: Evidence[];
  detections: Detection[];
}): Score {
  const weights = STAGE_WEIGHTS[input.category];

  let disclosed = 0;
  let point = 0;
  let discrepancy = 0;
  let maxConfidence = 0;
  let contradicted = false;

  const stages = STAGES.map((stage): StageScore => {
    const d = LEVEL_INFO[input.disclosure[stage]].value;
    const found = input.detections.filter((x) => x.stage === stage && x.confidence > 0);
    let detected: number | null = null;
    let effective = d;

    if (found.length) {
      // "No AI" against a file that says it's AI goes to a person, however little
      // the stage counts towards the score.
      if (d === 0 && found.some((x) => x.source === METADATA_SOURCE && x.share > 0)) contradicted = true;

      // Pool several detectors: confidence-weighted share, combined confidence.
      const confSum = found.reduce((n, x) => n + x.confidence, 0);
      detected = found.reduce((n, x) => n + x.share * x.confidence, 0) / confSum;
      const confidence = Math.min(0.95, 1 - found.reduce((n, x) => n * (1 - x.confidence), 1));
      maxConfidence = Math.max(maxConfidence, confidence);
      const gap = Math.max(0, detected - d);
      effective = d + gap * confidence;
      discrepancy += weights[stage] * gap * confidence;
    }

    disclosed += weights[stage] * d;
    point += weights[stage] * effective;
    return { stage, weight: weights[stage], disclosed: d, detected, effective };
  });

  const hasDetection = input.detections.some((x) => x.confidence > 0);
  const uncertainty =
    0.1 + (hasDetection ? 0.06 * (1 - maxConfidence) : 0.06) + 0.25 * discrepancy;

  const percent = Math.round(point * 100);
  // The range never dips below what the creator disclosed.
  const low = Math.min(percent, Math.max(Math.round(disclosed * 100), Math.round((point - uncertainty) * 100)));
  const high = Math.min(100, Math.max(percent, Math.round((point + uncertainty) * 100)));

  const needsReview = contradicted || discrepancy >= REVIEW_THRESHOLD;
  const blocked = disclosed > MAX_DISCLOSED;

  const score: Omit<Score, "notes"> = {
    version: 2,
    percent,
    low,
    high,
    disclosedPercent: Math.round(disclosed * 100),
    tier: tierFor(percent),
    evidenceStrength: 0,
    processVerified: false,
    discrepancy: Math.round(discrepancy * 100),
    needsReview,
    blocked,
    stages,
  };
  return { ...score, notes: scoreNotes(score, contradicted) };
}

/**
 * The plain-language notes under a score. They're built from the score itself,
 * so a score stored months ago still shows today's wording. They appear on
 * listings and Journal posts alike, so they say "work". `contradicted` is known
 * at scoring time; from a stored score it's inferred: a review with a detector
 * disagreement below the threshold can only have come from file metadata.
 */
export function scoreNotes(
  score: Omit<Score, "notes">,
  contradicted = score.needsReview && score.discrepancy < Math.round(REVIEW_THRESHOLD * 100),
) {
  const notes: string[] = [];
  const hasDetection = score.stages.some((s) => s.detected !== null);
  if (score.blocked) notes.push(`Disclosed AI use is above the ${Math.round(MAX_DISCLOSED * 100)}% limit for new work.`);
  if (contradicted) notes.push("The file's metadata says AI was used where the disclosure says it wasn't, so a person will review this.");
  else if (score.needsReview) notes.push("Automated analysis found noticeably more AI than was disclosed, so a person will review this work.");
  else if (score.discrepancy > 3) notes.push("Automated analysis found slightly more AI than was disclosed. The estimate includes that.");
  // What the number is and isn't is said once, on the score card itself (Score.tsx).
  if (!hasDetection) notes.push("Nothing in this work could be scanned automatically, so the score rests on the creator's disclosure alone.");
  return notes;
}

/** Remove the old attachment discount without scanning already-stripped files. */
export function upgradeScore(previous: Score): Score {
  if (previous.version === 2) return previous;
  const discount = 1 - 0.5 * previous.evidenceStrength;
  const stages = previous.stages.map((s) => ({ ...s, effective: s.disclosed + (s.effective - s.disclosed) / discount }));
  const percent = Math.round(stages.reduce((sum, s) => sum + s.weight * s.effective, 0) * 100);
  const result = { ...previous, version: 2, stages, percent, tier: tierFor(percent), evidenceStrength: 0, processVerified: false,
    low: previous.disclosedPercent, high: 100 };
  return { ...result, notes: scoreNotes(result) };
}
