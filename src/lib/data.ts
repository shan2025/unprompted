import "server-only";
import { and, asc, avg, count, desc, eq, inArray, like, lte, or, sql, sum } from "drizzle-orm";
import { isCategory } from "./categories";
import { db, schema } from "./db";
import { TIER_INFO, type Tier } from "./scoring";

const { listings, users, orders, flags } = schema;

// Listings anyone can see. "in_review" and "removed" are owner/admin only.
const PUBLIC_STATUSES = ["published", "sold"] as const;

const cardFields = {
  id: listings.id,
  slug: listings.slug,
  title: listings.title,
  category: listings.category,
  summary: listings.summary,
  priceCents: listings.priceCents,
  coverFile: listings.coverFile,
  aiPercent: listings.aiPercent,
  aiLow: listings.aiLow,
  aiHigh: listings.aiHigh,
  tier: listings.tier,
  processVerified: listings.processVerified,
  status: listings.status,
  isDemo: listings.isDemo,
  createdAt: listings.createdAt,
  creatorName: users.name,
  creatorHandle: users.handle,
};

export const SORTS = {
  new: "Newest",
  "least-ai": "Least AI first",
  "price-low": "Price: low to high",
  "price-high": "Price: high to low",
} as const;
export type Sort = keyof typeof SORTS;

export interface ListingFilters {
  q?: string;
  category?: string;
  maxAi?: number;
  verified?: boolean;
  sort?: Sort;
  limit?: number;
}

export async function searchListings(filters: ListingFilters) {
  const where = [inArray(listings.status, PUBLIC_STATUSES)];
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    where.push(or(like(listings.title, term), like(listings.summary, term), like(users.name, term))!);
  }
  if (filters.category && isCategory(filters.category)) where.push(eq(listings.category, filters.category));
  if (filters.maxAi !== undefined) where.push(lte(listings.aiPercent, filters.maxAi));
  if (filters.verified) where.push(eq(listings.processVerified, true));

  const order = {
    new: [desc(listings.createdAt)],
    "least-ai": [asc(listings.aiPercent), desc(listings.createdAt)],
    "price-low": [asc(listings.priceCents), desc(listings.createdAt)],
    "price-high": [desc(listings.priceCents), desc(listings.createdAt)],
  }[filters.sort ?? "new"];

  return db
    .select(cardFields)
    .from(listings)
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(and(...where))
    .orderBy(...order)
    .limit(filters.limit ?? 60);
}

export type ListingCard = Awaited<ReturnType<typeof searchListings>>[number];

export async function getListing(slug: string) {
  const [row] = await db
    .select({ listing: listings, creator: { id: users.id, name: users.name, handle: users.handle, bio: users.bio } })
    .from(listings)
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(eq(listings.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function hasPurchased(listingId: number, userId: number) {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.listingId, listingId), eq(orders.buyerId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function salesCount(listingId: number) {
  const [row] = await db.select({ n: count() }).from(orders).where(eq(orders.listingId, listingId));
  return row?.n ?? 0;
}

export async function getCreator(handle: string) {
  const [creator] = await db
    .select({ id: users.id, name: users.name, handle: users.handle, bio: users.bio, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  if (!creator) return null;

  const items = await db
    .select(cardFields)
    .from(listings)
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(and(eq(listings.creatorId, creator.id), inArray(listings.status, PUBLIC_STATUSES)))
    .orderBy(desc(listings.createdAt));

  const [stats] = await db
    .select({ sales: count(orders.id) })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .where(eq(listings.creatorId, creator.id));

  const avgAi = items.length ? Math.round(items.reduce((n, l) => n + l.aiPercent, 0) / items.length) : null;
  return {
    creator,
    listings: items,
    stats: { avgAi, verified: items.filter((l) => l.processVerified).length, sales: stats?.sales ?? 0 },
  };
}

export async function getDashboard(userId: number) {
  const mine = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      aiPercent: listings.aiPercent,
      tier: listings.tier,
      priceCents: listings.priceCents,
      createdAt: listings.createdAt,
      sales: sql<number>`(select count(*) from ${orders} where ${orders.listingId} = ${listings.id})`,
    })
    .from(listings)
    .where(eq(listings.creatorId, userId))
    .orderBy(desc(listings.createdAt));

  const [revenue] = await db
    .select({ total: sum(orders.amountCents), n: count(orders.id) })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .where(eq(listings.creatorId, userId));

  const purchases = await db
    .select({
      slug: listings.slug,
      title: listings.title,
      amountCents: orders.amountCents,
      createdAt: orders.createdAt,
      creatorName: users.name,
    })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(eq(orders.buyerId, userId))
    .orderBy(desc(orders.createdAt));

  return {
    listings: mine,
    sales: { count: revenue?.n ?? 0, totalCents: Number(revenue?.total ?? 0) },
    purchases,
  };
}

export async function getReviewQueue() {
  const pending = await db
    .select({ listing: listings, creatorName: users.name, creatorHandle: users.handle })
    .from(listings)
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(eq(listings.status, "in_review"))
    .orderBy(asc(listings.createdAt));

  const openFlags = await db
    .select({
      id: flags.id,
      reason: flags.reason,
      details: flags.details,
      createdAt: flags.createdAt,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      listingStatus: listings.status,
      aiPercent: listings.aiPercent,
      reporter: users.handle,
    })
    .from(flags)
    .innerJoin(listings, eq(flags.listingId, listings.id))
    .innerJoin(users, eq(flags.reporterId, users.id))
    .where(eq(flags.status, "open"))
    .orderBy(asc(flags.createdAt));

  return { pending, openFlags };
}

export async function marketStats() {
  const [row] = await db
    .select({ n: count(), avgAi: avg(listings.aiPercent) })
    .from(listings)
    .where(inArray(listings.status, PUBLIC_STATUSES));
  const [creators] = await db.select({ n: sql<number>`count(distinct ${listings.creatorId})` }).from(listings);
  return { listings: row?.n ?? 0, avgAi: Math.round(Number(row?.avgAi ?? 0)), creators: creators?.n ?? 0 };
}

export function tierLabel(tier: string) {
  return TIER_INFO[tier as Tier]?.label ?? tier;
}
