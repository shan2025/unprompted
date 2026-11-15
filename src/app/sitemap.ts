import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { browseHref } from "@/lib/browse";
import { usedCategories } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { worthIndexing } from "@/lib/indexing";

const { listings, posts, users } = schema;
const STATIC_PAGES = ["/", "/explore", "/marketplace", "/journal", "/standard", "/contact", "/terms", "/privacy", "/refunds"];
// One sitemap file may list 50,000 addresses. This leaves plenty of room.
const MAX_OF_EACH = 10_000;

// Demo work, anything hidden and very short posts (indexing.ts) stay out, so search engines only see real, public work.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();

  const [exploreCrafts, marketCrafts, listingRows, postRows] = await Promise.all([
    // Craft pages (/explore/crafts) only once they hold real work.
    usedCategories("explore", { realOnly: true }),
    usedCategories("marketplace", { realOnly: true }),
    db
      .select({ slug: listings.slug, createdAt: listings.createdAt, handle: users.handle })
      .from(listings)
      .innerJoin(users, eq(listings.creatorId, users.id))
      .where(and(inArray(listings.status, ["published", "sold"]), eq(listings.isDemo, false)))
      .orderBy(desc(listings.createdAt))
      .limit(MAX_OF_EACH),
    db
      .select({
        slug: posts.slug,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        handle: users.handle,
        subtitle: posts.subtitle,
        // Enough to count past MIN_INDEXED_WORDS without loading every full post.
        body: sql<string>`left(${posts.body}, 2000)`,
        coverFile: posts.coverFile,
        videoUrl: posts.videoUrl,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.status, "published"), eq(posts.isDemo, false)))
      .orderBy(desc(posts.createdAt))
      .limit(MAX_OF_EACH)
      .then((rows) => rows.filter(worthIndexing)),
  ]);
  const handles = new Set([...listingRows, ...postRows].map((row) => row.handle));

  return [
    ...STATIC_PAGES.map((path) => ({ url: `${base}${path === "/" ? "" : path}` })),
    ...exploreCrafts.map((c) => ({ url: `${base}${browseHref("explore", c)}` })),
    ...marketCrafts.map((c) => ({ url: `${base}${browseHref("marketplace", c)}` })),
    ...listingRows.map((l) => ({ url: `${base}/listing/${l.slug}`, lastModified: l.createdAt })),
    ...postRows.map((p) => ({ url: `${base}/journal/${p.slug}`, lastModified: p.updatedAt ?? p.createdAt })),
    ...[...handles].map((handle) => ({ url: `${base}/u/${handle}` })),
  ];
}
