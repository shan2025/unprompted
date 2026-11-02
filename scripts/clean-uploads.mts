// Replaces images uploaded before public copies existed: strips their metadata
// and shrinks them, in place. It can't be undone, because the originals are
// overwritten. Images that are already clean are left alone, so it's safe to re-run.
import "./env.mts";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { closeDb, db, schema } from "../src/lib/db";
import { makePublicImage, MAX_PUBLIC_EDGE } from "../src/lib/public-image";

const { uploads } = schema;
let cleaned = 0;
let unreadable = 0;

const rows = await db.select({ name: uploads.name }).from(uploads);
for (const { name } of rows) {
  const [row] = await db.select({ bytes: uploads.bytes }).from(uploads).where(eq(uploads.name, name)).limit(1);
  const meta = await sharp(row.bytes).metadata().catch(() => null);
  const clean =
    meta?.format === "webp" &&
    !meta.exif && !meta.xmp && !meta.iptc && !meta.icc &&
    Math.max(meta.width, meta.pageHeight ?? meta.height) <= MAX_PUBLIC_EDGE;
  if (clean) continue;

  const bytes = await makePublicImage(row.bytes);
  if (!bytes) {
    console.warn(`Couldn't read ${name}. It's unchanged, so check it by hand.`);
    unreadable++;
    continue;
  }
  await db.update(uploads).set({ bytes, contentType: "image/webp" }).where(eq(uploads.name, name));
  cleaned++;
}

await closeDb();
console.log(`Checked ${rows.length} images: cleaned ${cleaned}, unreadable ${unreadable}.`);
