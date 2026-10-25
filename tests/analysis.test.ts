import { describe, expect, it } from "vitest";
import { analyzeText, combineAnalyses, detectKind } from "@/lib/analysis/text";
import { scanImageMetadata, sniffImageType } from "@/lib/analysis/media";
import {
  CASUAL_HUMAN,
  DICKINSON,
  FROST,
  HUMAN_CODE,
  MACHINE_CODE,
  MACHINE_POEM,
  MACHINE_PROSE,
  THOREAU,
} from "./fixtures";

describe("prose analysis", () => {
  it("reads machine-style prose as mostly generated", () => {
    const result = analyzeText(MACHINE_PROSE, "prose");
    expect(result.aiShare).toBeGreaterThan(0.7);
    expect(result.signals.join(" ")).toMatch(/vocabulary|Formulaic/);
  });

  it("reads public-domain human prose as human", () => {
    expect(analyzeText(THOREAU, "prose").aiShare).toBeLessThan(0.15);
  });

  it("reads casual human writing as human", () => {
    expect(analyzeText(CASUAL_HUMAN, "prose").aiShare).toBeLessThan(0.15);
  });

  it("scores a mixed document between the two", () => {
    const mixed = `${THOREAU}\n\n${MACHINE_PROSE}`;
    const share = analyzeText(mixed, "prose").aiShare;
    expect(share).toBeGreaterThan(0.25);
    expect(share).toBeLessThan(0.8);
  });

  it("keeps segment offsets inside the text", () => {
    const result = analyzeText(MACHINE_PROSE, "prose");
    for (const seg of result.segments) {
      expect(seg.start).toBeGreaterThanOrEqual(0);
      expect(seg.end).toBeLessThanOrEqual(MACHINE_PROSE.length);
      expect(MACHINE_PROSE.slice(seg.start, seg.end).trim().length).toBeGreaterThan(0);
    }
  });

  it("caps confidence and lowers it for short text", () => {
    expect(analyzeText(MACHINE_PROSE, "prose").confidence).toBeLessThanOrEqual(0.55);
    expect(analyzeText("A short line of text.", "prose").confidence).toBeLessThan(0.15);
  });

  it("handles empty input", () => {
    expect(analyzeText("   ", "prose")).toMatchObject({ aiShare: 0, confidence: 0, segments: [] });
  });
});

describe("poetry analysis", () => {
  it("scores stock-imagery verse above classic poems", () => {
    const machine = analyzeText(MACHINE_POEM, "poetry").aiShare;
    expect(machine).toBeGreaterThan(0.6);
    expect(analyzeText(FROST, "poetry").aiShare).toBeLessThan(0.2);
    expect(analyzeText(DICKINSON, "poetry").aiShare).toBeLessThan(0.2);
  });
});

describe("code analysis", () => {
  it("flags narrated, tutorial-style code", () => {
    expect(analyzeText(MACHINE_CODE, "code").aiShare).toBeGreaterThan(0.6);
  });

  it("treats terse code with TODOs as human", () => {
    expect(analyzeText(HUMAN_CODE, "code").aiShare).toBeLessThan(0.15);
  });

  it("detects code vs prose vs poetry", () => {
    expect(detectKind(HUMAN_CODE, "other")).toBe("code");
    expect(detectKind(THOREAU, "code")).toBe("prose");
    expect(detectKind(FROST, "poetry")).toBe("poetry");
  });
});

describe("combineAnalyses", () => {
  it("weights by word count and ignores empty parts", () => {
    const a = analyzeText(THOREAU, "prose");
    const b = analyzeText(MACHINE_PROSE, "prose");
    const combined = combineAnalyses([a, b, analyzeText("", "prose")]);
    expect(combined).not.toBeNull();
    expect(combined!.words).toBe(a.words + b.words);
    expect(combined!.aiShare).toBeGreaterThan(Math.min(a.aiShare, b.aiShare));
    expect(combined!.aiShare).toBeLessThan(Math.max(a.aiShare, b.aiShare));
  });

  it("returns null when there is nothing to analyze", () => {
    expect(combineAnalyses([])).toBeNull();
  });
});

describe("image metadata", () => {
  const bytes = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));

  it("spots IPTC generative source types", () => {
    expect(scanImageMetadata(bytes("xmp digitalsourcetype/trainedAlgorithmicMedia")).aiSignal).toBe("strong");
    expect(scanImageMetadata(bytes("digitalsourcetype/compositeWithTrainedAlgorithmicMedia")).aiSignal).toBe("partial");
  });

  it("spots generator parameters", () => {
    const sd = scanImageMetadata(bytes("tEXtparameters\0a cat, Steps: 30, Sampler: Euler a, CFG scale: 7"));
    expect(sd.aiSignal).toBe("strong");
    expect(sd.findings.join(" ")).toContain("Stable Diffusion");
  });

  it("notes C2PA and camera data without calling it AI", () => {
    const scan = scanImageMetadata(bytes("\xff\xd8\xffExif\0\0 Canon EOS R5 ... jumb c2pa.manifest"));
    expect(scan.aiSignal).toBe("none");
    expect(scan.c2pa).toBe(true);
    expect(scan.camera).toBe("Canon");
  });

  it("says nothing either way when there is no metadata", () => {
    const scan = scanImageMetadata(bytes("plain pixels"));
    expect(scan.aiSignal).toBe("none");
    expect(scan.c2pa).toBe(false);
  });

  it("sniffs image types from magic bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("png");
    expect(sniffImageType(bytes("RIFF\0\0\0\0WEBP"))).toBe("webp");
    expect(sniffImageType(bytes("<svg"))).toBeNull();
  });
});
