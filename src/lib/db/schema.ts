import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SavedPhoto } from "../product-photos";
import type { Shipment } from "../qikink";
import type { MediaScan } from "../analysis/media";
import type { Segment } from "../analysis/text";
import type { Disclosure, Evidence, Score } from "../scoring";
import type { EvidenceReview } from "../evidence";
import type { DraftPayload } from "../drafts";

// Every table enables row-level security with no policies. The app connects
// as the database owner, which bypasses RLS, while Supabase's public data API
// (the anon and authenticated roles) can read nothing.

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const id = () => integer("id").primaryKey().generatedAlwaysAsIdentity();

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: id(),
  /** Null for people who signed up with a phone number and haven't added an email. */
  email: text("email").unique(),
  /** Mobile number in E.164 form (+919876543210), confirmed with a texted code. Null if they never added one. */
  phone: text("phone").unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  bio: text("bio").notNull().default(""),
  avatarFile: text("avatar_file"),
  /** Links to the person's other profiles and sites, in the order they chose. */
  links: jsonb("links").$type<string[]>().notNull().default([]),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  /** Emails about new followers, comments and appreciations. Orders and questions always send. */
  emailNotifications: boolean("email_notifications").notNull().default(true),
  /** One of the hand-picked first creators. Shown as a permanent badge; a moderator sets it. */
  founding: boolean("founding").notNull().default(false),
  /** When they proved they own the email: a link we sent, or a Google login. Null until then. */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [check("users_email_or_phone", sql`${t.email} is not null or ${t.phone} is not null`)]).enableRLS();

/** Six-digit codes texted to log in, sign up or add a number to an account. */
export const phoneCodes = pgTable(
  "phone_codes",
  {
    id: id(),
    phone: text("phone").notNull(),
    // SHA-256 of the phone and code together; the code itself is never stored.
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("phone_codes_phone_idx").on(t.phone, t.createdAt)],
).enableRLS();

export const sessions = pgTable("sessions", {
  // SHA-256 of the cookie token, so a leaked database can't be replayed.
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}).enableRLS();

export const directMessages = pgTable("direct_messages", {
  id: id(),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: integer("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  replyToId: integer("reply_to_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  /** Set when the sender changes the text. Unsent messages are deleted outright. */
  editedAt: timestamp("edited_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [
  check("direct_messages_distinct_members", sql`${t.senderId} <> ${t.recipientId}`),
  check("direct_messages_body_length", sql`char_length(${t.body}) between 1 and 2000`),
  foreignKey({ columns: [t.replyToId], foreignColumns: [t.id] }).onDelete("set null"),
  index("direct_messages_reply_to_idx").on(t.replyToId).where(sql`${t.replyToId} is not null`),
  index("direct_messages_sender_idx").on(t.senderId, t.recipientId, t.id),
  index("direct_messages_recipient_idx").on(t.recipientId, t.senderId, t.id),
]).enableRLS();

/** One emoji reaction per person per message; reacting again replaces it. */
export const directMessageReactions = pgTable("direct_message_reactions", {
  messageId: integer("message_id").notNull().references(() => directMessages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
  createdAt: createdAt(),
}, (t) => [
  primaryKey({ columns: [t.messageId, t.userId] }),
  check("direct_message_reactions_emoji_length", sql`char_length(${t.emoji}) between 1 and 16`),
]).enableRLS();

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
    // ISO code the seller priced it in (see currency.ts). Shown as entered, never converted.
    currency: text("currency").notNull().default("USD"),
    license: text("license").notNull(),
    productType: text("product_type"),
    gallery: jsonb("gallery").$type<SavedPhoto[]>().notNull().default([]),
    coverFile: text("cover_file"),
    /** Colour theme for the generated cover when there's no image (cover-themes.ts). Null picks from the slug. */
    coverTheme: text("cover_theme"),
    /** Pattern for the generated cover (cover-themes.ts). Null draws the pattern of the work's category. */
    coverPattern: text("cover_pattern"),
    // Where buyers pay the seller directly. Empty on free and demo listings.
    paymentUrl: text("payment_url"),
    status: text("status", { enum: ["published", "in_review", "sold", "removed", "withdrawn"] })
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
    evidenceReview: jsonb("evidence_review").$type<EvidenceReview>(),
    moderationReason: text("moderation_reason").notNull().default(""),
    isDemo: boolean("is_demo").notNull().default(false),
    /** When a moderator put it in the home page's Featured row. Null when it isn't featured. */
    featuredAt: timestamp("featured_at", { withTimezone: true }),
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
    // The listing's currency when the order was made, so totals never mix rupees and dollars.
    currency: text("currency").notNull().default("USD"),
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

// Checkouts through a payment gateway (Cashfree), for listings where the money
// comes to Unprompters rather than the seller. One row per gateway order: it's
// "created" when the buyer opens checkout, and becomes "paid" (with an order
// row marked paid) once the gateway confirms it. "refund_due" means the money
// arrived but the listing couldn't be delivered, such as an exclusive listing
// another buyer paid for first, so the owner has to refund it.
export const payments = pgTable(
  "payments",
  {
    id: id(),
    provider: text("provider", { enum: ["cashfree"] }).notNull(),
    /** Our order ID at the gateway, also kept on the order as its payment reference. */
    providerOrderId: text("provider_order_id").notNull().unique(),
    shipment: jsonb("shipment").$type<Shipment>(),
    fulfillment: text("fulfillment", { enum: ["waiting", "submitting", "sent", "review"] }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: integer("buyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: text("status", { enum: ["created", "paid", "failed", "refund_due"] }).notNull().default("created"),
    createdAt: createdAt(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("payments_listing_idx").on(t.listingId, t.status, t.createdAt), index("payments_buyer_idx").on(t.buyerId)],
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
    /** Colour theme for the generated cover when there's no image (cover-themes.ts). Null picks from the slug. */
    coverTheme: text("cover_theme"),
    /** Pattern for the generated cover (cover-themes.ts). Null draws the pattern of the work's category. */
    coverPattern: text("cover_pattern"),
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
    evidenceReview: jsonb("evidence_review").$type<EvidenceReview>(),
    moderationReason: text("moderation_reason").notNull().default(""),
    isDemo: boolean("is_demo").notNull().default(false),
    /** When a moderator put it in the home page's Featured row. Null when it isn't featured. */
    featuredAt: timestamp("featured_at", { withTimezone: true }),
    createdAt: createdAt(),
    /** When the author last edited it. Null if never edited. Tells search engines to look again. */
    updatedAt: timestamp("updated_at", { withTimezone: true }),
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

/** Private, incomplete form snapshots. Attachments never use the public file route. */
export const workDrafts = pgTable("work_drafts", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["post", "listing"] }).notNull(),
  targetSlug: text("target_slug").notNull().default(""),
  payload: jsonb("payload").$type<DraftPayload>().notNull(),
  version: integer("version").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("work_drafts_user_idx").on(t.userId, t.updatedAt)]).enableRLS();

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

export const emailVerifications = pgTable(
  "email_verifications",
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
  (t) => [index("email_verifications_user_idx").on(t.userId)],
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
