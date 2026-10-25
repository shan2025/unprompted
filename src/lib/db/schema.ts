import { boolean, customType, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
    // "demo" until a payment provider is connected; see README.
    status: text("status", { enum: ["demo", "paid", "refunded"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("orders_listing_buyer_idx").on(t.listingId, t.buyerId), index("orders_buyer_idx").on(t.buyerId)],
).enableRLS();

export const flags = pgTable(
  "flags",
  {
    id: id(),
    listingId: integer("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    reporterId: integer("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason", { enum: ["undisclosed-ai", "stolen", "misleading", "other"] }).notNull(),
    details: text("details").notNull().default(""),
    status: text("status", { enum: ["open", "dismissed", "upheld"] })
      .notNull()
      .default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("flags_listing_idx").on(t.listingId), index("flags_reporter_idx").on(t.reporterId)],
).enableRLS();

export const uploads = pgTable("uploads", {
  name: text("name").primaryKey(),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  createdAt: createdAt(),
}).enableRLS();

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Flag = typeof flags.$inferSelect;
