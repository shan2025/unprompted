import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { makePublicImage, MAX_PUBLIC_EDGE } from "@/lib/public-image";

const photo = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#884422" } })
    .withExif({ IFD0: { Make: "QA-CAMERA" }, IFD3: { GPSLatitude: "12/1 58/1 17/1" } })
    .jpeg()
    .toBuffer();

describe("makePublicImage", () => {
  it("removes metadata", async () => {
    const original = await photo(400, 300);
    expect(original.toString("latin1")).toContain("QA-CAMERA");

    const output = await makePublicImage(original);
    expect(output!.toString("latin1")).not.toContain("QA-CAMERA");
    const meta = await sharp(output!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("shrinks large images and keeps their shape", async () => {
    const meta = await sharp((await makePublicImage(await photo(4000, 2000)))!).metadata();
    expect(meta.width).toBe(MAX_PUBLIC_EDGE);
    expect(meta.height).toBe(MAX_PUBLIC_EDGE / 2);
  });

  it("doesn't enlarge small images", async () => {
    const meta = await sharp((await makePublicImage(await photo(200, 100)))!).metadata();
    expect(meta.width).toBe(200);
  });

  it("keeps animation", async () => {
    const frame = (background: string) => sharp({ create: { width: 2000, height: 2000, channels: 3, background } }).png().toBuffer();
    const gif = await sharp([await frame("#884422"), await frame("#224488"), await frame("#448822")], { join: { animated: true } }).gif().toBuffer();
    expect((await sharp(gif).metadata()).pages).toBe(3);

    const meta = await sharp((await makePublicImage(gif))!, { animated: true }).metadata();
    expect(meta.pages).toBeGreaterThan(1);
    expect(meta.pageHeight).toBeLessThanOrEqual(MAX_PUBLIC_EDGE);
  });

  it("returns null for bytes that aren't really an image", async () => {
    expect(await makePublicImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0xff, 0xd9]))).toBeNull();
  });
});
