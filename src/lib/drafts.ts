export type DraftKind = "post" | "listing";
export type DraftFile = { name: string; type: string; data: string };
export type DraftPayload = { fields: [string, string][]; files: [string, DraftFile][] };
export type WorkDraft = { id: string; kind: DraftKind; targetSlug: string; payload: DraftPayload; version: number; updatedAt: string };
export const EMPTY_DRAFT: DraftPayload = { fields: [], files: [] };
export const MAX_DRAFT_FILES_BYTES = 4 * 1024 * 1024;
const FIELD = /^(title|subtitle|category|body|summary|preview|locked|aiNotes|videoUrl|price|currency|paymentUrl|license|cover_theme|cover_pattern|remove_cover|photo_slot|keep_evidence|evidence_kind|evidence_row|evidence_url|evidence_note|workVersion|disclosure_(mode|ideation|creation|refinement|assets))$/;
const FILE = /^(cover|gallery|evidence_file_\d+)$/;

/** No attestation, account identifiers, review flags, or action metadata is saved. */
export async function draftPayload(fd: FormData): Promise<DraftPayload> {
  const fields: DraftPayload["fields"] = [];
  const files: DraftPayload["files"] = [];
  let textSize = 0, fileSize = 0;
  for (const [key, value] of fd) {
    if (typeof value === "string") {
      if (!FIELD.test(key)) continue;
      textSize += value.length;
      if (textSize > 150_000 || fields.length >= 100) throw new Error("This draft has too much text. Keep it under 150,000 characters.");
      fields.push([key, value]);
    } else if (FILE.test(key) && value.size) {
      fileSize += value.size;
      if (fileSize > MAX_DRAFT_FILES_BYTES || files.length >= 12) throw new Error("Use up to six product photos and six evidence files, totalling 4 MB or less.");
      const bytes = new Uint8Array(await value.arrayBuffer());
      // Works in both Node and the browser; chunking avoids argument limits.
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      files.push([key, { name: value.name.slice(0, 200), type: value.type.slice(0, 100), data: btoa(binary) }]);
    }
  }
  return { fields, files };
}

export function draftFormData(payload: DraftPayload) {
  const form = new FormData();
  for (const [key, value] of payload.fields) if (FIELD.test(key)) form.append(key, value);
  for (const [key, file] of payload.files) {
    if (!FILE.test(key)) continue;
    const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
    form.append(key, new File([bytes], file.name, { type: file.type }));
  }
  return form;
}

export function matchesDraft(left: DraftPayload, right: DraftPayload) {
  // PostgreSQL jsonb may reorder object keys. Compare file values, not their serialization.
  return JSON.stringify(left.fields) === JSON.stringify(right.fields)
    && left.files.length === right.files.length
    && left.files.every(([key, file], index) => {
      const [otherKey, other] = right.files[index];
      return key === otherKey && file.name === other.name && file.type === other.type && file.data === other.data;
    });
}

export function draftHref(draft: Pick<WorkDraft, "kind" | "targetSlug" | "id">) {
  const root = draft.kind === "post" ? "/journal" : "/listing";
  const path = draft.targetSlug ? `${root}/${encodeURIComponent(draft.targetSlug)}/edit` : draft.kind === "post" ? "/journal/new" : "/sell";
  return `${path}?draft=${encodeURIComponent(draft.id)}`;
}
