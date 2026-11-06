import { describe, expect, it } from "vitest";
import { parseDisclosure, type FieldErrors } from "@/lib/listing-form";
import { parsePostForm } from "@/lib/post-form";
import { STAGES } from "@/lib/scoring";

function post(fields: Record<string, string>) {
  const fd = new FormData();
  fd.append("title", "My short film");
  fd.append("category", "film");
  for (const stage of STAGES) fd.append(`disclosure_${stage}`, "none");
  fd.append("attest", "on");
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("AI disclosure", () => {
  it("refuses a disclosure with a stage left unanswered", () => {
    const fd = new FormData();
    for (const stage of STAGES.slice(1)) fd.append(`disclosure_${stage}`, "none");
    const errors: FieldErrors = {};
    parseDisclosure(fd, errors);
    expect(errors.disclosure).toMatch(/every stage/);
  });
});

describe("video posts", () => {
  const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

  it("can't be published without saying the video is yours", async () => {
    const parsed = await parsePostForm(post({ videoUrl: VIDEO }), { requireAttestation: true });
    expect(parsed.errors?.ownVideo).toMatch(/your own work/);
  });

  it("publishes once the video is confirmed as yours", async () => {
    const parsed = await parsePostForm(post({ videoUrl: VIDEO, ownVideo: "on" }), { requireAttestation: true });
    expect(parsed.errors).toBeUndefined();
    expect(parsed.values?.videoUrl).toBeTruthy();
  });

  it("doesn't ask when there's no video, or when only checking the score", async () => {
    expect((await parsePostForm(post({ body: "Words only." }), { requireAttestation: true })).errors).toBeUndefined();
    expect((await parsePostForm(post({ videoUrl: VIDEO }), { requireAttestation: false })).errors).toBeUndefined();
  });
});
