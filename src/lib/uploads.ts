import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";

// Images are stored in the database, so the app runs on hosts without a
// persistent disk (Vercel) with nothing extra to set up. Uploads are capped
// at 4 MB. Move to object storage (S3, R2, Vercel Blob...) if that grows.
const NAME = /^[a-z0-9]{24}\.(?:jpg|png|webp|gif)$/;

export const CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
} as const;

export async function saveUpload(bytes: Uint8Array, ext: keyof typeof CONTENT_TYPES) {
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await db.insert(schema.uploads).values({ name, contentType: CONTENT_TYPES[ext], bytes: Buffer.from(bytes) });
  return name;
}

export async function readUpload(name: string) {
  if (!NAME.test(name)) return null;
  const [row] = await db.select().from(schema.uploads).where(eq(schema.uploads.name, name)).limit(1);
  return row ? { bytes: row.bytes, type: row.contentType } : null;
}
