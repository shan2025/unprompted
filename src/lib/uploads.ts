import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Local disk storage. Swap these two functions for an object store (S3, R2,
// Supabase Storage...) when deploying somewhere without a persistent disk.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "data", "uploads");
const NAME = /^[a-z0-9]{24}\.(?:jpg|png|webp|gif)$/;

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function saveUpload(bytes: Uint8Array, ext: keyof typeof CONTENT_TYPES) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), bytes);
  return name;
}

export async function readUpload(name: string) {
  if (!NAME.test(name)) return null;
  try {
    const bytes = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
    return { bytes, type: CONTENT_TYPES[name.split(".").pop()!] };
  } catch {
    return null;
  }
}
