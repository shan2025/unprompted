import { describe, expect, it } from "vitest";
import { assess } from "@/lib/assess";
import { parseEvidence, type FieldErrors } from "@/lib/listing-form";
import { parsePostForm } from "@/lib/post-form";
import { evidenceStrength, STAGES } from "@/lib/scoring";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = new TextEncoder().encode("%PDF-1.7 rest of the file");

function row(fd: FormData, id: number, fields: { kind?: string; url?: string; note?: string; file?: File }) {
  fd.append("evidence_kind", fields.kind ?? "drafts");
  fd.append("evidence_row", String(id));
  fd.append("evidence_url", fields.url ?? "");
  fd.append("evidence_note", fields.note ?? "");
  if (fields.file) fd.append(`evidence_file_${id}`, fields.file);
}

describe("parseEvidence", () => {
  it("matches each file to its own row, whichever rows have files", async () => {
    const fd = new FormData();
    row(fd, 3, { url: "https://example.com/a" });
    row(fd, 7, { kind: "sketches", file: new File([PNG], "sketch.png") });
    row(fd, 9, { note: "only a note" });
    row(fd, 12, { kind: "version-history", file: new File([PDF], "history.pdf") });

    const errors: FieldErrors = {};
    const { evidence, files } = await parseEvidence(fd, errors);

    expect(errors).toEqual({});
    expect(evidence.map((e) => e.kind)).toEqual(["drafts", "sketches", "drafts", "version-history"]);
    expect(files.map((f) => [f.index, f.pdf])).toEqual([
      [1, false],
      [3, true],
    ]);
  });

  it("gives an uploaded file the same credit as a link, and a note none", async () => {
    const fd = new FormData();
    row(fd, 0, { file: new File([PNG], "draft.png") });
    row(fd, 1, { note: "only a note" });
    const { evidence } = await parseEvidence(fd, {});
    expect(evidenceStrength(evidence)).toBe(evidenceStrength([{ kind: "drafts", url: "https://example.com/a" }]));
  });

  it("refuses a file that is neither an image nor a PDF, whatever it's called", async () => {
    const fd = new FormData();
    row(fd, 0, { file: new File(["<script>alert(1)</script>"], "draft.pdf", { type: "application/pdf" }) });
    const errors: FieldErrors = {};
    const { evidence, files } = await parseEvidence(fd, errors);
    expect(errors.evidence).toMatch(/JPG, PNG, WebP, GIF or PDF/);
    expect(evidence).toEqual([]);
    expect(files).toEqual([]);
  });

  it("carries uploaded files through a post's form parsing and scoring", async () => {
    const fd = new FormData();
    fd.append("title", "A post with evidence");
    fd.append("category", "writing");
    fd.append("body", "Written by hand.");
    for (const stage of STAGES) fd.append(`disclosure_${stage}`, "none");
    row(fd, 0, { file: new File([PDF], "draft.pdf") });

    const parsed = await parsePostForm(fd, { requireAttestation: false });
    const v = parsed.values!;
    expect(v.evidenceFiles).toHaveLength(1);

    const result = await assess({ ...v, preview: v.body, locked: "", image: null });
    expect(result.score.evidenceStrength).toBe(0.25);
    expect(result.evidence[0].file).toBeTruthy();
  });

  it("ignores rows left empty", async () => {
    const fd = new FormData();
    row(fd, 0, { file: new File([], "") });
    expect(await parseEvidence(fd, {})).toEqual({ evidence: [], files: [] });
  });
});
