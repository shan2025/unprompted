import { isCategory, type CategoryId } from "./categories";
import { parseDisclosure, parseEvidence, parseImage, str, type EvidenceFile, type FieldErrors, type ParsedImage, type PreviewResult } from "./listing-form";
import type { Disclosure, Evidence } from "./scoring";
import { parseVideoLink, VIDEO_LINK_HELP } from "./video";

export const MAX_BODY = 50_000;
export const MAX_COMMENT = 2_000;

export interface ParsedPost {
  title: string;
  subtitle: string;
  category: CategoryId;
  body: string;
  videoUrl: string | null;
  aiNotes: string;
  disclosure: Disclosure;
  evidence: Evidence[];
  evidenceFiles: EvidenceFile[];
  image: ParsedImage;
}

export type PostPreviewState = { ok: true; result: PreviewResult } | { ok: false; errors: FieldErrors; message?: string };
export type PostCreateState = { errors?: FieldErrors; message?: string } | null;

export async function parsePostForm(fd: FormData, { requireAttestation }: { requireAttestation: boolean }) {
  const errors: FieldErrors = {};

  const title = str(fd, "title");
  if (title.length < 3 || title.length > 100) errors.title = "Use 3 to 100 characters.";

  const subtitle = str(fd, "subtitle");
  if (subtitle.length > 160) errors.subtitle = "Keep the subtitle under 160 characters.";

  const category = str(fd, "category");
  if (!isCategory(category)) errors.category = "Pick a category.";

  const body = str(fd, "body");
  if (body.length > MAX_BODY) errors.body = "Keep the post under 50,000 characters.";

  const videoLink = str(fd, "videoUrl");
  const videoUrl = videoLink ? parseVideoLink(videoLink) : null;
  if (videoLink && !videoUrl) errors.videoUrl = VIDEO_LINK_HELP;

  const aiNotes = str(fd, "aiNotes");
  if (aiNotes.length > 1000) errors.aiNotes = "Keep this under 1,000 characters.";

  const disclosure = parseDisclosure(fd, errors);
  const { evidence, files: evidenceFiles } = await parseEvidence(fd, errors);
  const image = await parseImage(fd, errors);

  if (!body && !image && !videoLink && !errors.cover) errors.body = "Write something, or add a video or an image.";

  if (requireAttestation && fd.get("attest") !== "on") {
    errors.attest = "Please confirm your disclosure is accurate.";
  }
  // Video can't be scanned, so anyone could embed someone else's film and score
  // it 0%. At the least, the person posting has to say it's theirs.
  if (requireAttestation && videoUrl && fd.get("ownVideo") !== "on") {
    errors.ownVideo = "Confirm the video is your own work, or remove the link.";
  }

  if (Object.keys(errors).length) return { errors };

  const values: ParsedPost = { title, subtitle, category: category as CategoryId, body, videoUrl, aiNotes, disclosure, evidence, evidenceFiles, image };
  return { values };
}
