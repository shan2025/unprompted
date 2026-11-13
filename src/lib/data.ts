import "server-only";
import { and, asc, avg, count, desc, eq, gt, ilike, inArray, lte, or, sql, sum } from "drizzle-orm";
import { isCategory } from "./categories";
import type { Sort } from "./sorts";
import { hideDemo } from "./demo";
import { db, schema } from "./db";
import { TIER_INFO, type Tier } from "./scoring";

const { listings, posts, users, orders, flags, inquiries } = schema;

// Listings anyone can see. "in_review" and "removed" are owner/admin only.
const PUBLIC_STATUSES = ["published", "sold"] as const;

// Orders that count as sales and unlock the work.
export const COMPLETED_ORDERS = ["demo", "paid"] as const;

const cardFields = {
  id: listings.id,
  slug: listings.slug,
  title: listings.title,
  category: listings.category,
  summary: listings.summary,
  priceCents: listings.priceCents,
  currency: listings.currency,
  coverFile: listings.coverFile,
  coverTheme: listings.coverTheme,
  coverPattern: listings.coverPattern,
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

export { SORTS, type Sort } from "./sorts";

export interface ListingFilters {
  q?: string;
  categories?: string[];
  maxAi?: number;
  verified?: boolean;
  /** Only listings that cost money, or only free ones. */
  price?: "paid" | "free";
  sort?: Sort;
  /** Only listings by people this user follows. */
  followedBy?: number;
  limit?: number;
}

export async function searchListings(filters: ListingFilters) {
  const where = [inArray(listings.status, PUBLIC_STATUSES)];
  if (filters.q) {
    const term = `%${filters.q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(listings.title, term), ilike(listings.summary, term), ilike(users.name, term))!);
  }
  const categories = filters.categories?.filter(isCategory) ?? [];
  if (categories.length) where.push(inArray(listings.category, categories));
  if (filters.maxAi !== undefined) where.push(lte(listings.aiPercent, filters.maxAi));
  if (filters.verified) where.push(eq(listings.processVerified, true));
  if (filters.price === "paid") where.push(gt(listings.priceCents, 0));
  if (filters.price === "free") where.push(eq(listings.priceCents, 0));
  if (hideDemo()) where.push(eq(listings.isDemo, false));
  if (filters.followedBy !== undefined) {
    where.push(
      inArray(
        listings.creatorId,
        db.select({ id: schema.follows.followingId }).from(schema.follows).where(eq(schema.follows.followerId, filters.followedBy)),
      ),
    );
  }

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

/**
 * Categories that have at least one public piece on a page, so the filter
 * chips skip empty ones. Explore holds free listings and posts; the
 * marketplace holds listings with a price; the journal holds posts.
 */
export async function usedCategories(page: "explore" | "marketplace" | "journal") {
  const listingWhere = [
    inArray(listings.status, PUBLIC_STATUSES),
    page === "marketplace" ? gt(listings.priceCents, 0) : eq(listings.priceCents, 0),
  ];
  if (hideDemo()) listingWhere.push(eq(listings.isDemo, false));
  const postWhere = [eq(posts.status, "published")];
  if (hideDemo()) postWhere.push(eq(posts.isDemo, false));

  const [fromListings, fromPosts] = await Promise.all([
    page === "journal" ? [] : db.selectDistinct({ category: listings.category }).from(listings).where(and(...listingWhere)),
    page !== "marketplace" ? db.selectDistinct({ category: posts.category }).from(posts).where(and(...postWhere)) : [],
  ]);
  return [...new Set([...fromListings, ...fromPosts].map((r) => r.category).filter(isCategory))];
}

export async function getListing(slug: string) {
  const [row] = await db
    .select({ listing: listings, creator: { id: users.id, name: users.name, handle: users.handle, bio: users.bio } })
    .from(listings)
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(hideDemo() ? and(eq(listings.slug, slug), eq(listings.isDemo, false)) : eq(listings.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getOrderStatus(listingId: number, userId: number) {
  const [row] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.listingId, listingId), eq(orders.buyerId, userId)))
    .limit(1);
  return row?.status ?? null;
}

/**
 * How long a buyer's payment claim holds an exclusive listing for them. A seller
 * who never answers would otherwise keep it off the market for good; after this,
 * other buyers can claim it too, and whichever claim the seller confirms wins.
 */
export const CLAIM_HOLD_DAYS = 7;

export function claimHoldCutoff() {
  return new Date(Date.now() - CLAIM_HOLD_DAYS * 24 * 60 * 60 * 1000);
}

/** True when an exclusive listing is spoken for while its seller checks a recent payment. */
export async function hasPendingOrder(listingId: number) {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.listingId, listingId), eq(orders.status, "pending"), gt(orders.createdAt, claimHoldCutoff())))
    .limit(1);
  return Boolean(row);
}

export async function salesCount(listingId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.listingId, listingId), inArray(orders.status, COMPLETED_ORDERS)));
  return row?.n ?? 0;
}

export async function getCreator(handle: string) {
  const [creator] = await db
    .select({ id: users.id, name: users.name, handle: users.handle, bio: users.bio, avatarFile: users.avatarFile, links: users.links, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  if (!creator) return null;

  const items = await db
    .select(cardFields)
    .from(listings)
    .innerJoin(users, eq(listings.creatorId, users.id))
    .where(
      and(
        eq(listings.creatorId, creator.id),
        inArray(listings.status, PUBLIC_STATUSES),
        hideDemo() ? eq(listings.isDemo, false) : undefined,
      ),
    )
    .orderBy(desc(listings.createdAt));

  const [stats] = await db
    .select({ sales: count(orders.id) })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .where(and(eq(listings.creatorId, creator.id), inArray(orders.status, COMPLETED_ORDERS)));

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
      currency: listings.currency,
      createdAt: listings.createdAt,
      // Explicit table names: without a join drizzle leaves columns unqualified,
      // so "listing_id" = "id" would compare two columns of orders.
      sales: sql<number>`(select count(*)::int from orders o where o.listing_id = "listings"."id" and o.status in ('demo', 'paid'))`,
    })
    .from(listings)
    .where(eq(listings.creatorId, userId))
    .orderBy(desc(listings.createdAt));

  // One total per currency: rupees and dollars are never added together.
  const revenue = await db
    .select({ currency: orders.currency, total: sum(orders.amountCents), n: count(orders.id) })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .where(and(eq(listings.creatorId, userId), inArray(orders.status, COMPLETED_ORDERS)))
    .groupBy(orders.currency);

  const waiting = await db
    .select({
      id: orders.id,
      amountCents: orders.amountCents,
      currency: orders.currency,
      reference: orders.paymentReference,
      createdAt: orders.createdAt,
      slug: listings.slug,
      title: listings.title,
      buyerName: users.name,
      buyerHandle: users.handle,
    })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .innerJoin(users, eq(orders.buyerId, users.id))
    .where(and(eq(listings.creatorId, userId), eq(orders.status, "pending")))
    .orderBy(asc(orders.createdAt));

  const purchases = await db
    .select({
      slug: listings.slug,
      title: listings.title,
      amountCents: orders.amountCents,
      currency: orders.currency,
      status: orders.status,
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
    sales: {
      count: revenue.reduce((n, r) => n + r.n, 0),
      totals: revenue.map((r) => ({ currency: r.currency, cents: Number(r.total ?? 0) })).sort((a, b) => b.cents - a.cents),
    },
    waiting,
    purchases,
  };
}

/** True once someone has shared or listed anything. Everyone else is here to explore, so they don't see posting tools. */
export async function isCreator(userId: number) {
  const [[listing], [post]] = await Promise.all([
    db.select({ id: listings.id }).from(listings).where(eq(listings.creatorId, userId)).limit(1),
    db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, userId)).limit(1),
  ]);
  return Boolean(listing || post);
}

/** Where someone lands after logging in, unless they were on their way somewhere. */
export async function homePath(userId: number) {
  return (await isCreator(userId)) ? "/dashboard" : "/explore";
}

/** Questions people have asked about this creator's work, newest first. */
export async function getInquiries(creatorId: number) {
  return db
    .select({
      id: inquiries.id,
      message: inquiries.message,
      createdAt: inquiries.createdAt,
      senderName: users.name,
      senderHandle: users.handle,
      senderEmail: users.email,
      listingSlug: listings.slug,
      listingTitle: listings.title,
      postSlug: posts.slug,
      postTitle: posts.title,
    })
    .from(inquiries)
    .innerJoin(users, eq(inquiries.senderId, users.id))
    .leftJoin(listings, eq(inquiries.listingId, listings.id))
    .leftJoin(posts, eq(inquiries.postId, posts.id))
    .where(eq(inquiries.creatorId, creatorId))
    .orderBy(desc(inquiries.createdAt))
    .limit(50);
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
    .where(and(inArray(listings.status, PUBLIC_STATUSES), hideDemo() ? eq(listings.isDemo, false) : undefined));
  const [creators] = await db.select({ n: sql<number>`count(distinct ${listings.creatorId})::int` }).from(listings);
  return { listings: row?.n ?? 0, avgAi: Math.round(Number(row?.avgAi ?? 0)), creators: creators?.n ?? 0 };
}

export function tierLabel(tier: string) {
  return TIER_INFO[tier as Tier]?.label ?? tier;
}
