import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { MediaScan } from "../analysis/media";
import type { Segment } from "../analysis/text";
import type { Disclosure, Evidence, Score } from "../scoring";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  bio: text("bio").notNull().default(""),
  role: text("role", { enum: ["member", "admin"] }).notNull().default("member"),
  createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
  // SHA-256 of the cookie token, so a leaked database can't be replayed.
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export interface StoredAnalysis {
  score: Score;
  previewSegments: Segment[];
  previewKind: string | null;
  signals: string[];
  media: MediaScan | null;
  sources: string[];
  analyzedAt: string;
}

export const listings = sqliteTable(
  "listings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    processVerified: integer("process_verified", { mode: "boolean" }).notNull().default(false),
    disclosure: text("disclosure", { mode: "json" }).$type<Disclosure>().notNull(),
    evidence: text("evidence", { mode: "json" }).$type<Evidence[]>().notNull(),
    analysis: text("analysis", { mode: "json" }).$type<StoredAnalysis>().notNull(),
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("listings_status_idx").on(t.status, t.createdAt), index("listings_creator_idx").on(t.creatorId)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
  (t) => [uniqueIndex("orders_listing_buyer_idx").on(t.listingId, t.buyerId)],
);

export const flags = sqliteTable("flags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
});

export type User = typeof users.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Flag = typeof flags.$inferSelect;
