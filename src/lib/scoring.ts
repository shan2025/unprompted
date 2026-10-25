import { STAGE_WEIGHTS, type CategoryId } from "./categories";

// The AI-involvement score. It blends three sources:
//   1. what the creator discloses, stage by stage;
//   2. what automated detection finds in the work itself;
//   3. how much process evidence backs the disclosure up.
// The disclosure is a floor: we never report less AI than the creator admits.
// Detection can only push the estimate up, and only as far as its confidence
// allows. Evidence narrows the range and softens detector suspicion.

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
  note?: string;
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

export interface StageScore {
  stage: Stage;
  weight: number;
  disclosed: number;
  detected: number | null;
  effective: number;
}

export interface Score {
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
  let remaining = 1;
  for (const item of evidence) remaining *= 1 - (EVIDENCE_KINDS[item.kind]?.strength ?? 0);
  return Math.min(0.9, 1 - remaining);
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
  const E = evidenceStrength(input.evidence);
  const notes: string[] = [];

  let disclosed = 0;
  let point = 0;
  let discrepancy = 0;
  let maxConfidence = 0;

  const stages = STAGES.map((stage): StageScore => {
    const d = LEVEL_INFO[input.disclosure[stage]].value;
    const found = input.detections.filter((x) => x.stage === stage && x.confidence > 0);
    let detected: number | null = null;
    let effective = d;

    if (found.length) {
      // Pool several detectors: confidence-weighted share, combined confidence.
      const confSum = found.reduce((n, x) => n + x.confidence, 0);
      detected = found.reduce((n, x) => n + x.share * x.confidence, 0) / confSum;
      const confidence = Math.min(0.95, 1 - found.reduce((n, x) => n * (1 - x.confidence), 1));
      maxConfidence = Math.max(maxConfidence, confidence);
      const gap = Math.max(0, detected - d);
      effective = d + gap * confidence * (1 - 0.5 * E);
      discrepancy += weights[stage] * gap * confidence;
    }

    disclosed += weights[stage] * d;
    point += weights[stage] * effective;
    return { stage, weight: weights[stage], disclosed: d, detected, effective };
  });

  const hasDetection = input.detections.some((x) => x.confidence > 0);
  const uncertainty =
    0.02 + 0.08 * (1 - E) + (hasDetection ? 0.06 * (1 - maxConfidence) : 0.06) + 0.25 * discrepancy;

  const percent = Math.round(point * 100);
  // The range never dips below what the creator disclosed.
  const low = Math.min(percent, Math.max(Math.round(disclosed * 100), Math.round((point - uncertainty) * 100)));
  const high = Math.min(100, Math.max(percent, Math.round((point + uncertainty) * 100)));

  const needsReview = discrepancy >= REVIEW_THRESHOLD;
  const blocked = disclosed > MAX_DISCLOSED;

  if (blocked) notes.push("Disclosed AI use is above the 50% limit for new listings.");
  if (needsReview) notes.push("Automated analysis found noticeably more AI than was disclosed, so a person will review this listing.");
  else if (discrepancy > 0.03) notes.push("Automated analysis found slightly more AI than was disclosed. The estimate includes that.");
  if (!hasDetection) notes.push("Nothing in this listing could be scanned automatically, so the range is wider.");
  if (E >= 0.5) notes.push("Strong process evidence narrows the range.");
  else if (E === 0) notes.push("No process evidence attached. Adding drafts or a time-lapse narrows the range.");

  return {
    percent,
    low,
    high,
    disclosedPercent: Math.round(disclosed * 100),
    tier: tierFor(percent),
    evidenceStrength: Math.round(E * 100) / 100,
    processVerified: E >= 0.5,
    discrepancy: Math.round(discrepancy * 100),
    needsReview,
    blocked,
    stages,
    notes,
  };
}
