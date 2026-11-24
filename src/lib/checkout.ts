import "server-only";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { cashfreeEnabled, fetchCashfreeOrder, latestCashfreeAttempt } from "./cashfree";
import { db, schema } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { formatPrice, siteUrl } from "./format";
import { isCompanyOwner } from "./merch";
import { reportError } from "./report-error";
import { dispatchShipment } from "./fulfillment";

/**
 * How long a Cashfree checkout stays open. It also holds an exclusive listing
 * for that buyer, so two people can't pay for the one copy at once.
 */
export const CHECKOUT_MINUTES = 30;

/**
 * The company's own paid listings sell through Cashfree, so the money comes to
 * Unprompters. Everyone else's buyers keep paying the seller's own link.
 */
export function usesCashfree(listing: { creatorId: number; priceCents: number; isDemo: boolean }) {
  return listing.priceCents > 0 && !listing.isDemo && sellsThroughCashfree({ id: listing.creatorId });
}

/** Whether this seller's paid listings go through Cashfree, so they don't need a payment link of their own. */
export function sellsThroughCashfree(user: { id: number } | null) {
  return cashfreeEnabled() && isCompanyOwner(user);
}

export type Settled = { slug: string; outcome: "paid" | "pending" | "failed" | "refund_due" };

async function email(to: string | null, subject: string, lines: string[], path: string) {
  if (!to) return;
  const link = `${siteUrl()}${path}`;
  await sendEmail({
    to,
    subject,
    text: `${lines.join("\n\n")}\n\n${link}\n\nUnprompters`,
    html: `${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p>Unprompters</p>`,
  }).catch((error: unknown) => reportError({ where: "checkout email", message: String(error) }));
}

/**
 * Asks Cashfree how an order went and, once it's paid, unlocks the listing for
 * the buyer. Safe to call any number of times, from the return page and the
 * webhook alike: only the first call that sees it paid does anything.
 */
export async function settleCashfreeOrder(orderId: string, options: { revalidate?: boolean } = {}): Promise<Settled | null> {
  const [payment] = await db
    .select({ id: schema.payments.id, status: schema.payments.status, fulfillment: schema.payments.fulfillment, amountCents: schema.payments.amountCents, currency: schema.payments.currency, slug: schema.listings.slug })
    .from(schema.payments)
    .innerJoin(schema.listings, eq(schema.listings.id, schema.payments.listingId))
    .where(and(eq(schema.payments.providerOrderId, orderId), eq(schema.payments.provider, "cashfree")))
    .limit(1);
  if (!payment) return null;
  if (payment.status !== "created") {
    if (payment.status === "paid" && payment.fulfillment === "waiting") await dispatchShipment(payment.id);
    return { slug: payment.slug, outcome: payment.status };
  }

  const order = await fetchCashfreeOrder(orderId);
  if (order.order_status === "ACTIVE") {
    // Not paid yet. The order stays open until it expires, so a webhook can still
    // settle it, but a buyer whose attempt failed or who backed out can try again now.
    const attempt = await latestCashfreeAttempt(orderId).catch(() => "PENDING");
    return { slug: payment.slug, outcome: attempt === "PENDING" || attempt === "NOT_ATTEMPTED" ? "pending" : "failed" };
  }
  if (order.order_status !== "PAID") {
    await db.update(schema.payments).set({ status: "failed", fulfillment: null, shipment: null }).where(and(eq(schema.payments.id, payment.id), eq(schema.payments.status, "created")));
    return { slug: payment.slug, outcome: "failed" };
  }
  // Never trust an amount we didn't ask for.
  const amountMatches = Math.round(order.order_amount * 100) === payment.amountCents && order.order_currency === payment.currency;

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(schema.payments).where(eq(schema.payments.id, payment.id)).for("update");
    if (!locked || locked.status !== "created") return null;
    const [listing] = await tx.select().from(schema.listings).where(eq(schema.listings.id, locked.listingId)).for("update");
    if (!listing) return null;

    const refund = async () => {
      await tx.update(schema.payments).set({ status: "refund_due", paidAt: new Date(), fulfillment: null, shipment: null }).where(eq(schema.payments.id, locked.id));
      return { outcome: "refund_due" as const, listing, buyerId: locked.buyerId };
    };
    if (!amountMatches) return refund();

    const [order] = await tx
      .insert(schema.orders)
      .values({ listingId: listing.id, buyerId: locked.buyerId, amountCents: locked.amountCents, currency: locked.currency, status: "paid", paymentReference: orderId })
      .onConflictDoUpdate({
        target: [schema.orders.listingId, schema.orders.buyerId],
        set: { status: "paid", amountCents: locked.amountCents, currency: locked.currency, paymentReference: orderId, createdAt: new Date() },
        // A buyer who already owns it has paid twice.
        setWhere: ne(schema.orders.status, "paid"),
      })
      .returning({ id: schema.orders.id });
    if (!order) return refund();

    if (listing.license === "exclusive") {
      // Someone else bought the only copy while this buyer was paying.
      if (listing.status === "sold") {
        const [other] = await tx.select({ id: schema.orders.id }).from(schema.orders)
          .where(and(eq(schema.orders.listingId, listing.id), eq(schema.orders.status, "paid"), ne(schema.orders.buyerId, locked.buyerId))).limit(1);
        if (other) {
          await tx.update(schema.orders).set({ status: "declined" }).where(eq(schema.orders.id, order.id));
          return refund();
        }
      }
      if (listing.status === "published") await tx.update(schema.listings).set({ status: "sold" }).where(eq(schema.listings.id, listing.id));
      await tx.update(schema.orders).set({ status: "declined" })
        .where(and(eq(schema.orders.listingId, listing.id), eq(schema.orders.status, "pending"), ne(schema.orders.buyerId, locked.buyerId)));
    }
    await tx.update(schema.payments).set({ status: "paid", paidAt: new Date() }).where(eq(schema.payments.id, locked.id));
    return { outcome: "paid" as const, listing, buyerId: locked.buyerId };
  });
  // Another call settled it first.
  if (!result) return settledAgain(payment.id, payment.slug);

  const { listing, outcome, buyerId } = result;
  const path = `/listing/${listing.slug}`;
  // Emails go out after the response, so neither the buyer's page nor Cashfree's webhook waits on them.
  after(async () => {
    const [buyer] = await db.select({ email: schema.users.email, name: schema.users.name, handle: schema.users.handle }).from(schema.users).where(eq(schema.users.id, buyerId)).limit(1);
    const [owner] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, listing.creatorId)).limit(1);
    const price = formatPrice(payment.amountCents, payment.currency);
    const who = `${buyer?.name ?? "A buyer"} (@${buyer?.handle ?? "unknown"})`;
    if (outcome === "paid") {
      await email(buyer?.email ?? null, `"${listing.title}" is yours`, [`Your payment of ${price} for "${listing.title}" went through. ${payment.fulfillment ? "We received your merchandise order." : "It's unlocked and ready for you."}`, `Cashfree order: ${orderId}`], path);
      await email(owner?.email ?? null, `New sale: "${listing.title}"`, [`${who} paid ${price} for "${listing.title}" through Cashfree.`, `Cashfree order: ${orderId}`], "/admin/merch");
    } else {
      await email(buyer?.email ?? null, `We'll refund your payment for "${listing.title}"`, [`Your payment of ${price} for "${listing.title}" arrived, but we couldn't complete the order. For example, someone else bought this exclusive listing a moment earlier, or you already own it.`, "We'll refund it to the way you paid. You don't need to do anything.", `Cashfree order: ${orderId}`], path);
      await email(owner?.email ?? null, `Refund needed: "${listing.title}"`, [`${who} paid ${price} for "${listing.title}", but the order couldn't be completed (already sold, already owned, or the amount didn't match).`, `Refund Cashfree order ${orderId} from the Cashfree dashboard.`], "/admin/merch");
      await reportError({ where: "checkout", message: `Cashfree order ${orderId} needs a refund`, path });
    }
  });
  // Next doesn't allow revalidating while a page renders. Those pages read the
  // database on every visit anyway, so a page doing the check can skip it.
  if (options.revalidate !== false) {
    revalidatePath(path);
    revalidatePath("/dashboard");
    revalidatePath("/admin/merch");
  }
  if (outcome === "paid" && payment.fulfillment === "waiting") await dispatchShipment(payment.id);
  return { slug: listing.slug, outcome };
}

/**
 * The safety net for a buyer who paid, closed the tab, and whose webhook never
 * came (not set up yet, or the site was down longer than Cashfree retries).
 * When they open the listing again, ask Cashfree about their open checkouts.
 * Checkouts expire after CHECKOUT_MINUTES, after which Cashfree reports them
 * EXPIRED and they stop being checked; anything older than two days is left alone.
 */
export async function recheckOpenPayments(listingId: number, buyerId: number): Promise<Settled["outcome"] | null> {
  const open = await db
    .select({ orderId: schema.payments.providerOrderId })
    .from(schema.payments)
    .where(and(
      eq(schema.payments.listingId, listingId),
      eq(schema.payments.buyerId, buyerId),
      eq(schema.payments.status, "created"),
      gt(schema.payments.createdAt, new Date(Date.now() - 2 * 24 * 60 * 60_000)),
    ))
    .orderBy(desc(schema.payments.createdAt))
    .limit(3);
  let found: Settled["outcome"] | null = null;
  for (const { orderId } of open) {
    try {
      const settled = await settleCashfreeOrder(orderId, { revalidate: false });
      if (settled?.outcome === "paid") return "paid";
      if (settled?.outcome === "refund_due") found = "refund_due";
    } catch (error) {
      // Cashfree being unreachable mustn't break the page. The webhook or a later visit settles it.
      await reportError({ where: "recheckOpenPayments", message: String(error), path: `/listing (order ${orderId})` });
    }
  }
  return found;
}

async function settledAgain(paymentId: number, slug: string): Promise<Settled> {
  const [row] = await db.select({ status: schema.payments.status }).from(schema.payments).where(eq(schema.payments.id, paymentId)).limit(1);
  const status = row?.status ?? "failed";
  return { slug, outcome: status === "created" ? "pending" : status };
}
