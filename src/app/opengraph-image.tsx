import { SHARE_IMAGE_SIZE, SHARE_IMAGE_TYPE, shareImage } from "@/lib/share-image";

export const alt = "Unprompters: explore work made by people";
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_IMAGE_TYPE;

export default function Image() {
  return shareImage({ title: "Explore work made by people." });
}
