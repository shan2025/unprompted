import "server-only";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import type { EvidenceFile } from "./listing-form";
import { makePublicImage } from "./public-image";
import type { Evidence } from "./scoring";

// Files are stored in the database, so the app runs on hosts without a
// persistent disk (Vercel) with nothing extra to set up. Only a smaller public
// copy of an image is kept (public-image.ts). Move to object storage (S3, R2,
// Vercel Blob...) if that grows.
const NAME = /^[a-z0-9]{24}\.(?:jpg|png|webp|gif|pdf)$/;

export const CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
} as const;

function newName(extension: keyof typeof CONTENT_TYPES) {
  return `${randomBytes(12).toString("hex")}.${extension}`;
}

/** Stores the public copy and returns its name, or null if the image can't be read. */
export async function saveUpload(original: Uint8Array) {
  const bytes = await makePublicImage(original);
  if (!bytes) return null;
  const name = newName("webp");
  await db.insert(schema.uploads).values({ name, contentType: CONTENT_TYPES.webp, bytes });
  return name;
}

async function savePdf(bytes: Uint8Array) {
  const name = newName("pdf");
  await db.insert(schema.uploads).values({ name, contentType: CONTENT_TYPES.pdf, bytes: Buffer.from(bytes) });
  return name;
}

/** Stores evidence files and returns the evidence pointing at them, or null if an image can't be read. */
export async function saveEvidenceFiles(evidence: Evidence[], files: EvidenceFile[]) {
  const saved = [...evidence];
  const names: string[] = [];
  for (const { index, bytes, pdf } of files) {
    const name = pdf ? await savePdf(bytes) : await saveUpload(bytes);
    if (!name) {
      await deleteUploads(names);
      return null;
    }
    names.push(name);
    saved[index] = { ...saved[index], file: name };
  }
  return saved;
}

export async function deleteUploads(names: string[]) {
  if (names.length) await db.delete(schema.uploads).where(inArray(schema.uploads.name, names));
}

/** Runs `save`; if it fails, removes the files stored for it so none are left unused. */
export async function saveWithUploads(names: (string | null | undefined)[], save: () => Promise<unknown>) {
  try {
    await save();
  } catch (error) {
    // Report why the save failed, even if the cleanup fails too.
    await deleteUploads(names.filter((name) => typeof name === "string")).catch(() => {});
    throw error;
  }
}

export async function readUpload(name: string) {
  if (!NAME.test(name)) return null;
  const [row] = await db.select().from(schema.uploads).where(eq(schema.uploads.name, name)).limit(1);
  return row ? { bytes: row.bytes, type: row.contentType } : null;
}
