import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { makePublicImage } from "./public-image";

// Images are stored in the database, so the app runs on hosts without a
// persistent disk (Vercel) with nothing extra to set up. Only a smaller public
// copy is kept (public-image.ts). Move to object storage (S3, R2, Vercel Blob...)
// if that grows.
const NAME = /^[a-z0-9]{24}\.(?:jpg|png|webp|gif)$/;

export const CONTENT_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
} as const;

/** Stores the public copy and returns its name, or null if the image can't be read. */
export async function saveUpload(original: Uint8Array) {
  const bytes = await makePublicImage(original);
  if (!bytes) return null;
  const name = `${randomBytes(12).toString("hex")}.webp`;
  await db.insert(schema.uploads).values({ name, contentType: CONTENT_TYPES.webp, bytes });
  return name;
}

export async function readUpload(name: string) {
  if (!NAME.test(name)) return null;
  const [row] = await db.select().from(schema.uploads).where(eq(schema.uploads.name, name)).limit(1);
  return row ? { bytes: row.bytes, type: row.contentType } : null;
}
