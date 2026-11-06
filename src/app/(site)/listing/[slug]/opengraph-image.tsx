import { connection } from "next/server";
import { categoryLabel } from "@/lib/categories";
import { getListing } from "@/lib/data";
import { SHARE_IMAGE_SIZE, SHARE_IMAGE_TYPE, shareImage } from "@/lib/share-image";
import { TIER_INFO, type Tier } from "@/lib/scoring";

export const alt = "A work on Unprompters, with how much AI was involved";
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_IMAGE_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const row = await getListing(slug);
  // Hidden work keeps its title private.
  if (!row || (row.listing.status !== "published" && row.listing.status !== "sold")) return shareImage({ title: "Explore work made by people." });
  const { listing, creator } = row;
  return shareImage({
    title: listing.title,
    eyebrow: categoryLabel(listing.category),
    byline: `by ${creator.name}`,
    aiPercent: listing.aiPercent,
    tierLabel: TIER_INFO[listing.tier as Tier]?.label,
  });
}
