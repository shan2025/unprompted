import "server-only";
import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { isCompanyOwner } from "./merch";
import type { Transaction } from "./publishing";

const {
  users, listings, posts, orders, payments, postComments, postAppreciations, follows, directMessages,
  directMessageReactions, inquiries, flags, workDrafts, sessions, passwordResets, emailVerifications, phoneCodes, uploads,
} = schema;

/** Orders that a buyer, a seller or the law still needs after an account goes. Same list in SOLD. */
const KEPT_ORDERS = ["paid", "demo", "refunded", "pending"] as const;

/** A listing someone bought, or paid for. Explicit table names, since drizzle leaves single-table columns unqualified. */
const SOLD = or(
  sql`exists (select 1 from orders o where o.listing_id = "listings"."id" and o.status in ('paid', 'demo', 'refunded', 'pending'))`,
  sql`exists (select 1 from payments p where p.listing_id = "listings"."id" and p.status in ('paid', 'refund_due'))`,
);

type Account = { id: number; role: string };

/**
 * Why this account can't be deleted yet, or null if it can. Moderators and the
 * company owner run the site, so they ask us instead. Buyers waiting on a seller
 * to confirm their payment would be stranded, so those orders come first.
 */
export async function deletionBlocker(user: Account, store: typeof db | Transaction = db): Promise<string | null> {
  if (user.role === "admin") return "Moderator accounts can't be deleted here. Email us and we'll close it for you.";
  if (isCompanyOwner(user)) return "This account owns the company's shop, so it can't be deleted here. Email us and we'll close it for you.";
  const [waiting] = await store
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .innerJoin(listings, eq(listings.id, orders.listingId))
    .where(and(eq(listings.creatorId, user.id), eq(orders.status, "pending")));
  if (waiting.n > 0) {
    return `${waiting.n === 1 ? "A buyer is" : `${waiting.n} buyers are`} waiting for you to confirm a payment. Mark ${waiting.n === 1 ? "it" : "them"} paid or declined on your dashboard first.`;
  }
  return null;
}

/** How many of this person's listings have buyers, and so would stay behind, withdrawn. */
export async function soldListingCount(userId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(listings)
    .where(and(eq(listings.creatorId, userId), SOLD));
  return row.n;
}

export type DeletionResult = { outcome: "deleted" | "emptied"; email: string | null; name: string } | { blocked: string };

/**
 * Deletes an account and everything personal in it, in one transaction:
 * profile, posts, comments, appreciations, follows, messages, questions,
 * reports, drafts and uploaded files.
 *
 * Two things outlive it. Listings someone bought stay, withdrawn from the market,
 * so buyers keep what they paid for. And sales records stay for the seller and
 * for tax law. While either points at the account, its row is kept but emptied:
 * no email, phone, password, bio, photo or links, named "Deleted account".
 * Otherwise the row is deleted too.
 */
export async function deleteAccount(userId: number): Promise<DeletionResult> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!user || user.deletedAt) return { blocked: "This account has already been deleted." };
    const blocked = await deletionBlocker(user, tx);
    if (blocked) return { blocked };

    const mine = await tx
      .select({ id: listings.id, coverFile: listings.coverFile, gallery: listings.gallery, evidence: listings.evidence })
      .from(listings)
      .where(eq(listings.creatorId, user.id));
    const sold = new Set(mine.length ? (await tx
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.creatorId, user.id), SOLD))).map((l) => l.id) : []);
    const kept = mine.filter((l) => sold.has(l.id));
    const gone = mine.filter((l) => !sold.has(l.id));
    const myPosts = await tx.select({ coverFile: posts.coverFile, evidence: posts.evidence }).from(posts).where(eq(posts.authorId, user.id));

    // Uploaded files have public addresses, so they go with the work that used them.
    const keptFiles = new Set(kept.flatMap(listingFiles));
    const files = [user.avatarFile, ...gone.flatMap(listingFiles), ...myPosts.flatMap(postFiles)]
      .filter((name): name is string => name != null && !keptFiles.has(name));

    // Deleting a post or listing also removes its comments, appreciations, views, reports and questions.
    await tx.delete(posts).where(eq(posts.authorId, user.id));
    if (gone.length) await tx.delete(listings).where(inArray(listings.id, gone.map((l) => l.id)));
    await tx.delete(postComments).where(eq(postComments.authorId, user.id));
    await tx.delete(postAppreciations).where(eq(postAppreciations.userId, user.id));
    await tx.delete(follows).where(or(eq(follows.followerId, user.id), eq(follows.followingId, user.id)));
    await tx.delete(directMessageReactions).where(eq(directMessageReactions.userId, user.id));
    await tx.delete(directMessages).where(or(eq(directMessages.senderId, user.id), eq(directMessages.recipientId, user.id)));
    await tx.delete(inquiries).where(or(eq(inquiries.senderId, user.id), eq(inquiries.creatorId, user.id)));
    await tx.delete(flags).where(eq(flags.reporterId, user.id));
    await tx.delete(workDrafts).where(eq(workDrafts.userId, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.delete(passwordResets).where(eq(passwordResets.userId, user.id));
    await tx.delete(emailVerifications).where(eq(emailVerifications.userId, user.id));
    if (user.phone) await tx.delete(phoneCodes).where(eq(phoneCodes.phone, user.phone));
    if (files.length) await tx.delete(uploads).where(inArray(uploads.name, files));

    if (kept.length) {
      // Buyers keep access; nobody new can buy, and it leaves the home page.
      await tx.update(listings).set({ status: "withdrawn", paymentUrl: null, featuredAt: null })
        .where(and(inArray(listings.id, kept.map((l) => l.id)), notInArray(listings.status, ["removed"])));
    }

    const [asBuyer] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .where(and(eq(orders.buyerId, user.id), inArray(orders.status, KEPT_ORDERS)));
    // Any checkout at all: an open one can still be paid, and its record must survive.
    const [paid] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(payments)
      .where(eq(payments.buyerId, user.id));

    if (!kept.length && !asBuyer.n && !paid.n) {
      await tx.delete(users).where(eq(users.id, user.id));
      return { outcome: "deleted" as const, email: user.email, name: user.name };
    }
    // A hyphen can't appear in a chosen handle, so this never takes someone's name.
    await tx.update(users).set({
      email: null, phone: null, passwordHash: "deleted", name: "Deleted account", handle: `deleted-${user.id}`,
      bio: "", avatarFile: null, links: [], role: "member", emailNotifications: false, founding: false,
      emailVerifiedAt: null, deletedAt: new Date(),
    }).where(eq(users.id, user.id));
    return { outcome: "emptied" as const, email: user.email, name: user.name };
  });
}

function listingFiles(listing: { coverFile: string | null; gallery: { file: string }[]; evidence: { file?: string }[] }) {
  return [listing.coverFile, ...listing.gallery.map((p) => p.file), ...listing.evidence.map((e) => e.file)];
}

function postFiles(post: { coverFile: string | null; evidence: { file?: string }[] }) {
  return [post.coverFile, ...post.evidence.map((e) => e.file)];
}
