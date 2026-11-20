import { expect, it } from "vitest";
import { parseProductPhotos } from "@/lib/product-photos";

const saved = [{ file: "original.webp", media: null }];

it("retains the cover of an old listing when edited from a legacy draft", async () => {
  expect(await parseProductPhotos(new FormData(), saved, {})).toEqual(saved);
});

it("supports removing all the product photos", async () => {
  const data = new FormData();
  data.append("photo_slot", "");
  expect(await parseProductPhotos(data, saved, {})).toEqual([]);
});

it.each([["another-listing.webp"], ["original.webp", "original.webp"], ["upload"]])("validates every saved photo or upload slot", async (...slots) => {
  const data = new FormData();
  for (const slot of slots) data.append("photo_slot", slot);
  const errors = {};
  expect(await parseProductPhotos(data, saved, errors)).toEqual([]);
  expect(errors).toHaveProperty("gallery");
});
