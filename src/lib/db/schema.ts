import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { MediaScan } from "../analysis/media";
import type { Segment } from "../analysis/text";
import type { Disclosure, Evidence, Score } from "../scoring";

// Every table enables row-level security with no policies. The app connects
// as the database owner, which bypasses RLS, while Supabase's public data API
// (the anon and authenticated roles) can read nothing.

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  bio: text("bio").notNull().default(""),
  avatarFile: text("avatar_file"),
  /** Links to the person's other profiles and sites, in the order they chose. */
  links: jsonb("links").$type<string[]>().notNull().default([]),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  createdAt: createdAt(),
}).enableRLS();

export const sessions = pgTable("sessions", {
  // SHA-256 of the cookie token, so a leaked database can't be replayed.
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}).enableRLS();

export interface StoredAnalysis {
  score: Score;
  previewSegments: Segment[];
  previewKind: string | null;
  signals: string[];
  media: MediaScan | null;
  sources: string[];
  analyzedAt: string;
}

export const listings = pgTable(
  "listings",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull(),
    summary: text("summary").notNull(),
    preview: text("preview").notNull().default(""),
    locked: text("locked").notNull().default(""),
    aiNotes: text("ai_notes").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    license: text("license").notNull(),
    coverFile: text("cover_file"),
    // Where buyers pay the seller directly. Empty on free and demo listings.
    paymentUrl: text("payment_url"),
    status: text("status", { enum: ["published", "in_review", "sold", "removed"] })
      .notNull()
      .default("published"),
    aiPercent: integer("ai_percent").notNull(),
    aiLow: integer("ai_low").notNull(),
    aiHigh: integer("ai_high").notNull(),
    tier: text("tier").notNull(),
    processVerified: boolean("process_verified").notNull().default(false),
    disclosure: jsonb("disclosure").$type<Disclosure>().notNull(),
    evidence: jsonb("evidence").$type<Evidence[]>().notNull(),
    analysis: jsonb("analysis").$type<StoredAnalysis>().notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("listings_status_idx").on(t.status, t.createdAt), index("listings_creator_idx").on(t.creatorId)],
).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: id(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    // Buyers pay sellers directly, so we can't see the money. An order is "pending"
    // from the buyer saying they've paid until the seller marks it "paid" or
    // "declined". Free listings are "paid" at once; seeded demo listings are "demo".
    status: text("status", { enum: ["demo", "pending", "paid", "declined", "refunded"] }).notNull(),
    // What the buyer gave the seller to find the payment, such as a transaction ID.
    paymentReference: text("payment_reference").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("orders_listing_buyer_idx").on(t.listingId, t.buyerId), index("orders_buyer_idx").on(t.buyerId)],
).enableRLS();

// Journal posts: work shared for free. Scored exactly like listings, minus
// price, license and a locked deliverable.
export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    category: text("category").notNull(),
    body: text("body").notNull().default(""),
    aiNotes: text("ai_notes").notNull().default(""),
    coverFile: text("cover_file"),
    // A tidied YouTube or Vimeo link (see video.ts). We don't host video ourselves.
    videoUrl: text("video_url"),
    status: text("status", { enum: ["published", "in_review", "removed"] })
      .notNull()
      .default("published"),
    aiPercent: integer("ai_percent").notNull(),
    aiLow: integer("ai_low").notNull(),
    aiHigh: integer("ai_high").notNull(),
    tier: text("tier").notNull(),
    processVerified: boolean("process_verified").notNull().default(false),
    disclosure: jsonb("disclosure").$type<Disclosure>().notNull(),
    evidence: jsonb("evidence").$type<Evidence[]>().notNull(),
    analysis: jsonb("analysis").$type<StoredAnalysis>().notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("posts_status_idx").on(t.status, t.createdAt), index("posts_author_idx").on(t.authorId)],
).enableRLS();

export const postComments = pgTable(
  "post_comments",
  {
    id: id(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status", { enum: ["visible", "removed"] })
      .notNull()
      .default("visible"),
    createdAt: createdAt(),
  },
  (t) => [index("post_comments_post_idx").on(t.postId, t.createdAt), index("post_comments_author_idx").on(t.authorId)],
).enableRLS();

export const postAppreciations = pgTable(
  "post_appreciations",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] }), index("post_appreciations_user_idx").on(t.userId)],
).enableRLS();

// One row per visitor per post per day, so refreshing doesn't add views.
// `visitor` is a hash that includes the day, so the same person can't be
// followed from one day to the next, and no IP address is stored.
export const postViews = pgTable(
  "post_views",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    visitor: text("visitor").notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.day, t.visitor] })],
).enableRLS();

export const follows = pgTable(
  "follows",
  {
    followerId: integer("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: integer("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
    check("follows_not_self", sql`${t.followerId} <> ${t.followingId}`),
  ],
).enableRLS();

// A report points at exactly one listing, post or comment.
export const flags = pgTable(
  "flags",
  {
    id: id(),
    listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
    commentId: integer("comment_id").references(() => postComments.id, { onDelete: "cascade" }),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: ["undisclosed-ai", "stolen", "misleading", "abusive", "other"] }).notNull(),
    details: text("details").notNull().default(""),
    status: text("status", { enum: ["open", "dismissed", "upheld"] })
      .notNull()
      .default("open"),
    createdAt: createdAt(),
  },
  (t) => [
    index("flags_listing_idx").on(t.listingId),
    index("flags_post_idx").on(t.postId),
    index("flags_comment_idx").on(t.commentId),
    index("flags_reporter_idx").on(t.reporterId),
    check("flags_one_target", sql`num_nonnulls(${t.listingId}, ${t.postId}, ${t.commentId}) = 1`),
  ],
).enableRLS();

// "Ask the creator": a question about one listing or post, for example whether
// a work that isn't for sale could be bought. The creator replies by email.
export const inquiries = pgTable(
  "inquiries",
  {
    id: id(),
    listingId: integer("listing_id").references(() => listings.id, { onDelete: "cascade" }),
    postId: integer("post_id").references(() => posts.id, { onDelete: "cascade" }),
    senderId: integer("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("inquiries_creator_idx").on(t.creatorId, t.createdAt),
    index("inquiries_sender_idx").on(t.senderId),
    index("inquiries_listing_idx").on(t.listingId),
    index("inquiries_post_idx").on(t.postId),
    check("inquiries_one_target", sql`num_nonnulls(${t.listingId}, ${t.postId}) = 1`),
  ],
).enableRLS();

export const uploads = pgTable("uploads", {
  name: text("name").primaryKey(),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export const passwordResets = pgTable(
  "password_resets",
  {
    // SHA-256 of the emailed token; the token itself is never stored.
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("password_resets_user_idx").on(t.userId)],
).enableRLS();

// Attempt counters for log-in, sign-up and password resets (see rate-limit.ts).
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}).enableRLS();

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Flag = typeof flags.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
