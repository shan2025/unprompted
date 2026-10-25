import { describe, expect, it } from "vitest";
import { computeScore, evidenceStrength, tierFor, type Disclosure } from "@/lib/scoring";

const NONE: Disclosure = { ideation: "none", creation: "none", refinement: "none", assets: "none" };

describe("computeScore", () => {
  it("scores fully human work with no evidence as 0% with a wide range", () => {
    const s = computeScore({ category: "writing", disclosure: NONE, evidence: [], detections: [] });
    expect(s).toMatchObject({ percent: 0, low: 0, tier: "human-made", needsReview: false, blocked: false });
    expect(s.high).toBeGreaterThanOrEqual(10);
  });

  it("narrows the range when process evidence is attached", () => {
    const bare = computeScore({ category: "writing", disclosure: NONE, evidence: [], detections: [] });
    const proven = computeScore({
      category: "writing",
      disclosure: NONE,
      evidence: [{ kind: "drafts" }, { kind: "timelapse" }, { kind: "version-history" }],
      detections: [],
    });
    expect(proven.high).toBeLessThan(bare.high);
    expect(proven.processVerified).toBe(true);
  });

  it("turns disclosure into a weighted percentage", () => {
    const s = computeScore({
      category: "writing",
      disclosure: { ...NONE, refinement: "light" },
      evidence: [],
      detections: [],
    });
    expect(s.percent).toBe(2); // 0.15 weight * 0.15 level
    expect(s.disclosedPercent).toBe(2);
  });

  it("never reports less than the creator disclosed, even if detectors say human", () => {
    const s = computeScore({
      category: "writing",
      disclosure: { ...NONE, creation: "substantial" },
      evidence: [],
      detections: [{ stage: "creation", share: 0, confidence: 0.5, source: "test" }],
    });
    expect(s.percent).toBe(30);
    expect(s.low).toBe(30);
  });

  it("raises the estimate and asks for review when detectors disagree", () => {
    const s = computeScore({
      category: "writing",
      disclosure: NONE,
      evidence: [],
      detections: [{ stage: "creation", share: 0.9, confidence: 0.5, source: "test" }],
    });
    expect(s.percent).toBe(27);
    expect(s.needsReview).toBe(true);
    expect(s.low).toBeGreaterThanOrEqual(0);
    expect(s.low).toBeLessThan(s.percent);
    expect(s.high).toBeGreaterThan(s.percent);
  });

  it("lets evidence soften detector suspicion", () => {
    const detections = [{ stage: "creation" as const, share: 0.9, confidence: 0.5, source: "test" }];
    const bare = computeScore({ category: "writing", disclosure: NONE, evidence: [], detections });
    const proven = computeScore({
      category: "writing",
      disclosure: NONE,
      evidence: [{ kind: "timelapse" }, { kind: "recording" }],
      detections,
    });
    expect(proven.percent).toBeLessThan(bare.percent);
  });

  it("blocks listings that disclose more than half AI", () => {
    const s = computeScore({
      category: "writing",
      disclosure: { ...NONE, creation: "generated" },
      evidence: [],
      detections: [],
    });
    expect(s.blocked).toBe(true);
    expect(s.tier).toBe("ai-heavy");
  });

  it("sends AI-tagged artwork claimed as human to review", () => {
    const s = computeScore({
      category: "art",
      disclosure: NONE,
      evidence: [],
      detections: [{ stage: "creation", share: 1, confidence: 0.9, source: "metadata" }],
    });
    expect(s.needsReview).toBe(true);
    expect(s.percent).toBeGreaterThan(50);
    // Strong metadata evidence gives a usefully narrow range, not 0-100.
    expect(s.high - s.low).toBeLessThan(60);
  });
});

describe("helpers", () => {
  it("caps evidence strength", () => {
    expect(evidenceStrength([])).toBe(0);
    const many = Array.from({ length: 20 }, () => ({ kind: "timelapse" as const }));
    expect(evidenceStrength(many)).toBe(0.9);
  });

  it("maps percentages to tiers", () => {
    expect(tierFor(0)).toBe("human-made");
    expect(tierFor(5)).toBe("human-made");
    expect(tierFor(6)).toBe("human-led");
    expect(tierFor(20)).toBe("human-led");
    expect(tierFor(21)).toBe("ai-assisted");
    expect(tierFor(51)).toBe("ai-heavy");
  });
});
