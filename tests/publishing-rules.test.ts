import { describe, expect, it } from "vitest";
import { draftFormData, draftPayload, matchesDraft } from "@/lib/drafts";
import { evidenceUrl, hasDuplicateEvidence } from "@/lib/evidence";
import { parseEvidence } from "@/lib/listing-form";
import { assess } from "@/lib/assess";
import { computeScore, upgradeScore, type Disclosure } from "@/lib/scoring";

const disclosure: Disclosure = { ideation: "none", creation: "none", refinement: "none", assets: "none" };

describe("evidence trust boundary", () => {
  it("recognizes repeated links across types, fragments and query order", () => {
    expect(hasDuplicateEvidence([{ kind: "drafts", url: "https://EXAMPLE.com/a/?b=2&a=1#draft" }, { kind: "timelapse", url: "https://example.com/a?a=1&b=2" }])).toBe(true);
    expect(evidenceUrl("https://user:password@example.com/work")).toBeNull();
    expect(evidenceUrl("javascript:alert(1)")).toBeNull();
  });
  it("rejects identical attachments with different filenames and evidence types", async () => {
    const fd = new FormData();
    for (const [index, kind] of ["drafts", "timelapse"].entries()) {
      fd.append("evidence_row", String(index)); fd.append("evidence_kind", kind); fd.append("evidence_url", ""); fd.append("evidence_note", "");
      fd.append(`evidence_file_${index}`, new File(["%PDF-1.7 identical contents"], `file-${index}.pdf`));
    }
    const errors: Record<string, string> = {};
    const result = await parseEvidence(fd, errors);
    expect(errors.evidence).toMatch(/repeated/);
    expect(result.evidence[0].fingerprint).toHaveLength(64);
  });
  it("never converts a bare C2PA marker into provenance evidence", async () => {
    const result = await assess({ category: "art", disclosure, evidence: [], preview: "", locked: "", image: new TextEncoder().encode("not a manifest c2pa") });
    expect(result.evidence).toEqual([]);
    expect(result.score.processVerified).toBe(false);
    expect(result.score.evidenceStrength).toBe(0);
    expect(result.media?.findings.join(" ")).toContain("unverified");
  });
  it("upgrades historic scores without retaining attachment discounts or verification", () => {
    const baseline = computeScore({ category: "art", disclosure, evidence: [], detections: [{ stage: "creation", share: 0.8, confidence: 0.5, source: "test" }] });
    const legacy = { ...baseline, version: undefined, evidenceStrength: 0.6, processVerified: true,
      stages: baseline.stages.map((s) => ({ ...s, effective: s.disclosed + (s.effective - s.disclosed) * 0.7 })) };
    const current = upgradeScore(legacy);
    expect(current.percent).toBe(baseline.percent);
    expect(current.processVerified).toBe(false);
    expect(upgradeScore(current)).toBe(current);
  });
});

describe("private draft snapshots", () => {
  it("round trips incomplete forms, multiple evidence rows and binary attachments", async () => {
    const fd = new FormData();
    fd.append("title", "Unfinished 🌱"); fd.append("locked", "Private buyer deliverable");
    fd.append("evidence_row", "3"); fd.append("evidence_row", "9");
    fd.append("evidence_kind", "drafts"); fd.append("evidence_kind", "sketches");
    fd.append("cover", new File([new Uint8Array([0, 1, 128, 255])], "cover.png", { type: "image/png" }));
    const data = draftFormData(await draftPayload(fd));
    expect(data.get("title")).toBe("Unfinished 🌱");
    expect(data.get("locked")).toBe("Private buyer deliverable");
    expect(data.getAll("evidence_row")).toEqual(["3", "9"]);
    expect(new Uint8Array(await (data.get("cover") as File).arrayBuffer())).toEqual(new Uint8Array([0, 1, 128, 255]));
  });
  it("treats identical file snapshots as equal after a JSONB round trip", () => {
    const left = { fields: [], files: [["cover", { name: "a.png", type: "image/png", data: "YQ==" }]] } as Parameters<typeof matchesDraft>[0];
    const right = { fields: [], files: [["cover", { data: "YQ==", name: "a.png", type: "image/png" }]] } as typeof left;
    expect(matchesDraft(left, right)).toBe(true);
    right.files[0][1].data = "Yg==";
    expect(matchesDraft(left, right)).toBe(false);
  });
  it("never restores attestations, identity, review state, or server action metadata", async () => {
    const fd = new FormData();
    for (const key of ["attest", "ownVideo", "userId", "editSlug", "processVerified", "evidenceReview", "$ACTION_ID"]) fd.set(key, "forged");
    expect(await draftPayload(fd)).toEqual({ fields: [], files: [] });
  });
  it("enforces combined attachment size even when each file is small", async () => {
    const fd = new FormData();
    fd.set("cover", new File([new Uint8Array(3 * 1024 * 1024)], "cover.png"));
    fd.set("evidence_file_0", new File([new Uint8Array(2 * 1024 * 1024)], "draft.pdf"));
    await expect(draftPayload(fd)).rejects.toThrow(/4 MB/);
  });
});
