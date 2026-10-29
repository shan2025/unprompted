import { isCategory, type CategoryId } from "./categories";
import { parseDisclosure, parseEvidence, parseImage, str, type FieldErrors, type ParsedImage, type PreviewResult } from "./listing-form";
import type { Disclosure, Evidence } from "./scoring";

export const MAX_BODY = 50_000;
export const MAX_COMMENT = 2_000;

export interface ParsedPost {
  title: string;
  category: CategoryId;
  body: string;
  aiNotes: string;
  disclosure: Disclosure;
  evidence: Evidence[];
  image: ParsedImage;
}

export type PostPreviewState = { ok: true; result: PreviewResult } | { ok: false; errors: FieldErrors; message?: string };
export type PostCreateState = { errors?: FieldErrors; message?: string } | null;

export async function parsePostForm(fd: FormData, { requireAttestation }: { requireAttestation: boolean }) {
  const errors: FieldErrors = {};

  const title = str(fd, "title");
  if (title.length < 3 || title.length > 100) errors.title = "Use 3 to 100 characters.";

  const category = str(fd, "category");
  if (!isCategory(category)) errors.category = "Pick a category.";

  const body = str(fd, "body");
  if (body.length > MAX_BODY) errors.body = "Keep the post under 50,000 characters.";

  const aiNotes = str(fd, "aiNotes");
  if (aiNotes.length > 1000) errors.aiNotes = "Keep this under 1,000 characters.";

  const disclosure = parseDisclosure(fd, errors);
  const evidence = parseEvidence(fd, errors);
  const image = await parseImage(fd, errors);

  if (!body && !image && !errors.cover) errors.body = "Write something or add an image.";

  if (requireAttestation && fd.get("attest") !== "on") {
    errors.attest = "Please confirm your disclosure is accurate.";
  }

  if (Object.keys(errors).length) return { errors };

  const values: ParsedPost = { title, category: category as CategoryId, body, aiNotes, disclosure, evidence, image };
  return { values };
}
