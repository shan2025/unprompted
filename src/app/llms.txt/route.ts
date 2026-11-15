import { and, desc, eq, inArray } from "drizzle-orm";
import { connection } from "next/server";
import { browseHref } from "@/lib/browse";
import { CATEGORIES } from "@/lib/categories";
import { usedCategories } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { MAX_DISCLOSED, TIER_INFO, type Tier } from "@/lib/scoring";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/structured-data";

const { listings, posts } = schema;
const RECENT = 25;

// A plain-text guide for AI tools (llmstxt.org): what the site is, how its AI
// scores work, and where the real public work lives. Demo and hidden work stays out.
export async function GET() {
  await connection();
  const base = siteUrl();

  const [exploreCrafts, marketCrafts, postRows, listingRows] = await Promise.all([
    usedCategories("explore", { realOnly: true }),
    usedCategories("marketplace", { realOnly: true }),
    db
      .select({ slug: posts.slug, title: posts.title, aiPercent: posts.aiPercent, tier: posts.tier })
      .from(posts)
      .where(and(eq(posts.status, "published"), eq(posts.isDemo, false)))
      .orderBy(desc(posts.createdAt))
      .limit(RECENT),
    db
      .select({ slug: listings.slug, title: listings.title, aiPercent: listings.aiPercent, tier: listings.tier })
      .from(listings)
      .where(and(inArray(listings.status, ["published", "sold"]), eq(listings.isDemo, false)))
      .orderBy(desc(listings.createdAt))
      .limit(RECENT),
  ]);

  const tierLine = (tier: string) => TIER_INFO[tier as Tier]?.label ?? tier;
  const item = (path: string, r: { slug: string; title: string; aiPercent: number; tier: string }) =>
    `- [${r.title.replace(/[[\]]/g, "")}](${base}/${path}/${r.slug}): ${r.aiPercent}% AI, ${tierLine(r.tier)}`;

  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    `${SITE_NAME} is a place to explore and buy work made by people: writing, poetry, art, photography, design, music, film, code, websites, handicrafts and ideas. Every piece, shared for free or for sale, shows an AI-involvement estimate: roughly how much of the creative work came from AI rather than the person who made it, as a percentage with a range and the reasoning behind it.`,
    "",
    "How the estimate is built:",
    "- The creator discloses AI use separately for four stages (the idea, the making, the polish, the extras). Their disclosure is the floor: the site never shows less AI than a creator admits to.",
    "- Automated scans of text, code and file metadata (including C2PA Content Credentials and generator tags) can only raise a score, and only as far as their confidence allows.",
    "- Process evidence such as drafts, time-lapses and commit history narrows the range, and is public so anyone can check it.",
    "- Disagreements go to a human moderator, never to an automatic verdict.",
    `- New posts and listings must disclose ${Math.round(MAX_DISCLOSED * 100)}% AI or less.`,
    "",
    "Tiers:",
    ...(Object.keys(TIER_INFO) as Tier[]).map((t) => `- ${TIER_INFO[t].label} (${TIER_INFO[t].range}): ${TIER_INFO[t].blurb}`),
    "",
    "Buying: buyers pay the seller directly; Unprompters doesn't handle or hold the money.",
    "",
    "## Main pages",
    "",
    `- [How scoring works](${base}/standard): the full method, including what AI detection can't do`,
    `- [Explore](${base}/explore): all public work`,
    `- [Marketplace](${base}/marketplace): work for sale`,
    `- [Journal](${base}/journal): writing and posts by creators`,
    `- [Contact](${base}/contact)`,
    "",
    "## Crafts",
    "",
    // Crafts with real work link to their pages; the rest are listed so the range is clear.
    ...CATEGORIES.map((c) => {
      const links = [
        exploreCrafts.includes(c.id) && `[explore](${base}${browseHref("explore", c.id)})`,
        marketCrafts.includes(c.id) && `[for sale](${base}${browseHref("marketplace", c.id)})`,
      ].filter(Boolean);
      return `- ${c.label}: ${c.blurb}${links.length ? ` (${links.join(", ")})` : ""}`;
    }),
  ];
  if (postRows.length > 0) lines.push("", "## Recent journal posts", "", ...postRows.map((r) => item("journal", r)));
  if (listingRows.length > 0) lines.push("", "## Recent listings", "", ...listingRows.map((r) => item("listing", r)));
  lines.push(
    "",
    "## Optional",
    "",
    `- [Terms](${base}/terms)`,
    `- [Privacy](${base}/privacy)`,
    `- [Refunds](${base}/refunds)`,
    `- [Sitemap](${base}/sitemap.xml)`,
  );

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" },
  });
}
