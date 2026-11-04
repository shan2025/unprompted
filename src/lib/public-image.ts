import sharp from "sharp";
import { MAX_PUBLIC_EDGE } from "./public-image-size";

export { MAX_PUBLIC_EDGE };

// What the public sees of an uploaded image: small enough that it isn't the
// full-resolution work, and with all metadata (GPS, camera serial, name) gone.
// Metadata is scanned from the original before this runs. The original isn't kept.

/** The public copy as WebP, or null if the bytes aren't a readable image. */
export async function makePublicImage(bytes: Uint8Array) {
  try {
    const { pages = 1 } = await sharp(bytes).metadata();
    // Sharp can't auto-rotate animations, and they carry no orientation anyway.
    const image = pages > 1 ? sharp(bytes, { animated: true }) : sharp(bytes).rotate();
    return await image
      .resize({ width: MAX_PUBLIC_EDGE, height: MAX_PUBLIC_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}
