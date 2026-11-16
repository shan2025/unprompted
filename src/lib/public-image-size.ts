// Kept apart from public-image.ts, which needs sharp and can't load in the browser.
export const MAX_PUBLIC_EDGE = 1600;

/** Smaller widths the file route can serve (?w=480), so a phone doesn't download a desktop-sized picture. */
export const IMAGE_WIDTHS = [480, 800, 1200] as const;

/** The src and srcset for an uploaded image: the browser picks the smallest copy that looks sharp. */
export function imageSources(file: string) {
  const src = `/api/files/${file}`;
  const srcSet = [...IMAGE_WIDTHS.map((w) => `${src}?w=${w} ${w}w`), `${src} ${MAX_PUBLIC_EDGE}w`].join(", ");
  return { src, srcSet };
}
