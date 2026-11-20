import { scanImageMetadata, sniffImageType, type MediaScan } from "./analysis/media";
import { MAX_DRAFT_FILES_BYTES } from "./drafts";
import { MAX_PRODUCT_PHOTOS } from "./product-types";

export type SavedPhoto = { file: string; media: MediaScan | null };
export type ProductPhoto = SavedPhoto | { bytes: Uint8Array; media: MediaScan };

export async function parseProductPhotos(fd: FormData, saved: SavedPhoto[], errors: Partial<Record<string, string>>): Promise<ProductPhoto[]> {
  const ordered = fd.has("photo_slot");
  const uploads = fd.getAll(ordered ? "gallery" : "cover").filter((value): value is File => value instanceof File && value.size > 0);
  // Old drafts and clients sent a single cover, with an optional removal checkbox on edit.
  const slots = ordered ? fd.getAll("photo_slot").filter(Boolean) : [
    ...(uploads.length ? ["upload"] : saved.length && fd.get("remove_cover") !== "on" ? [saved[0].file] : []),
    ...saved.slice(1).map(photo => photo.file),
  ];
  const total = [...fd.values()].reduce((size, value) => size + (value instanceof File ? value.size : 0), 0);
  if (slots.length > MAX_PRODUCT_PHOTOS || total > MAX_DRAFT_FILES_BYTES) {
    errors.gallery = "Use up to six photos and keep all attachments within 4 MB.";
    return [];
  }
  const available = new Map(saved.map(photo => [photo.file, photo]));
  const photos: ProductPhoto[] = [];
  let index = 0;
  for (const slot of slots) {
    if (slot === "upload" && index < uploads.length) {
      const bytes = new Uint8Array(await uploads[index++].arrayBuffer());
      if (!sniffImageType(bytes)) {
        errors[ordered ? "gallery" : "cover"] = "Choose a JPG, PNG, WebP or GIF image.";
        return [];
      }
      photos.push({ bytes, media: scanImageMetadata(bytes) });
    } else {
      const kept = available.get(String(slot));
      if (!kept) { errors.gallery = "The photos have changed. Reload the listing and check the order."; return []; }
      photos.push(kept);
      available.delete(kept.file);
    }
  }
  if (index !== uploads.length) errors.gallery = "Check the photo order and try again.";
  return photos;
}
