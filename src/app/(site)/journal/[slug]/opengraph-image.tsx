import { connection } from "next/server";
import { categoryLabel } from "@/lib/categories";
import { getPost } from "@/lib/journal";
import { SHARE_IMAGE_SIZE, SHARE_IMAGE_TYPE, shareImage } from "@/lib/share-image";
import { TIER_INFO, type Tier } from "@/lib/scoring";

export const alt = "A work on Unprompters, with how much AI was involved";
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_IMAGE_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const row = await getPost(slug);
  // Hidden work keeps its title private.
  if (!row || row.post.status !== "published") return shareImage({ title: "Explore work made by people." });
  const { post, author } = row;
  return shareImage({
    title: post.title,
    eyebrow: categoryLabel(post.category),
    byline: `by ${author.name}`,
    aiPercent: post.aiPercent,
    tierLabel: TIER_INFO[post.tier as Tier]?.label,
  });
}
