import sharp from "sharp";
import { IMAGE_WIDTHS } from "@/lib/public-image-size";
import { readUpload } from "@/lib/uploads";

// Browsers keep a file for a year (names are random and never reused). The CDN
// keeps it for a day, so a picture is read from the database about once a day
// per region instead of on every view, and a removed file stops being served
// within a day.
const CACHE = "public, max-age=31536000, s-maxage=86400, immutable";

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = await readUpload(name);
  if (!file) return new Response("Not found", { status: 404 });

  const pdf = file.type === "application/pdf";
  const width = Number(new URL(req.url).searchParams.get("w"));
  const smaller = !pdf && (IMAGE_WIDTHS as readonly number[]).includes(width) ? await shrink(file.bytes, width) : null;

  return new Response(new Uint8Array(smaller ?? file.bytes), {
    headers: {
      "Content-Type": smaller ? "image/webp" : file.type,
      "Cache-Control": CACHE,
      "X-Content-Type-Options": "nosniff",
      // Asks AI crawlers that read this label not to train on the file (see ai-crawlers.ts).
      "X-Robots-Tag": "noai, noimageai",
      // A PDF is stored as the creator sent it, so it downloads rather than opening on our origin.
      ...(pdf && { "Content-Disposition": "attachment", "Content-Security-Policy": "sandbox" }),
    },
  });
}

/** A narrower WebP copy, or null to fall back to the stored file (already that small, or unreadable). */
async function shrink(bytes: Buffer, width: number) {
  try {
    const image = sharp(bytes, { animated: true });
    const { width: stored = 0 } = await image.metadata();
    if (stored <= width) return null;
    return await image.resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  } catch {
    return null;
  }
}
