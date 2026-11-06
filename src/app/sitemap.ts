import { and, desc, eq, inArray } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db, schema } from "@/lib/db";
import { siteUrl } from "@/lib/format";

const { listings, posts, users } = schema;
const STATIC_PAGES = ["/", "/explore", "/journal", "/standard", "/contact", "/terms", "/privacy", "/refunds"];
// One sitemap file may list 50,000 addresses. This leaves plenty of room.
const MAX_OF_EACH = 10_000;

// Demo work and anything hidden stays out, so search engines only see real, public work.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();

  const [listingRows, postRows] = await Promise.all([
    db
      .select({ slug: listings.slug, createdAt: listings.createdAt, handle: users.handle })
      .from(listings)
      .innerJoin(users, eq(listings.creatorId, users.id))
      .where(and(inArray(listings.status, ["published", "sold"]), eq(listings.isDemo, false)))
      .orderBy(desc(listings.createdAt))
      .limit(MAX_OF_EACH),
    db
      .select({ slug: posts.slug, createdAt: posts.createdAt, handle: users.handle })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.status, "published"), eq(posts.isDemo, false)))
      .orderBy(desc(posts.createdAt))
      .limit(MAX_OF_EACH),
  ]);
  const handles = new Set([...listingRows, ...postRows].map((row) => row.handle));

  return [
    ...STATIC_PAGES.map((path) => ({ url: `${base}${path === "/" ? "" : path}` })),
    ...listingRows.map((l) => ({ url: `${base}/listing/${l.slug}`, lastModified: l.createdAt })),
    ...postRows.map((p) => ({ url: `${base}/journal/${p.slug}`, lastModified: p.createdAt })),
    ...[...handles].map((handle) => ({ url: `${base}/u/${handle}` })),
  ];
}
