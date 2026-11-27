"use server";

import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { cashfreeMode, createCashfreeOrder, type CashfreeMode } from "@/lib/cashfree";
import { CHECKOUT_MINUTES, usesCashfree } from "@/lib/checkout";
import { COMPLETED_ORDERS } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { siteUrl } from "@/lib/format";
import { parsePhone } from "@/lib/phone";
import { withinLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";
import { track } from "@/lib/track";
import { fulfillmentVariants, prepareShipment, shipsThroughQikink } from "@/lib/qikink";

const SHIPPING_UNAVAILABLE = "Shipping is unavailable for this item. Please try again later.";

export type CheckoutState =
  | { message?: string; needsPhone?: boolean; session?: undefined }
  | { session: { id: string; mode: CashfreeMode }; message?: undefined; needsPhone?: undefined }
  | null;

/** Opens a Cashfree checkout for one of the company's listings. The page then hands the buyer to Cashfree. */
export async function startCheckout(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };

  // Cashfree needs a phone number for every order.
  const typed = String(fd.get("phone") ?? "").trim();
  const phone = typed ? parsePhone(typed) : user.phone;
  if (!phone) return { needsPhone: true, message: typed ? "Enter a valid mobile number, with the country code if it's outside India." : undefined };

  if (!(await withinLimit(`checkout:user:${user.id}`, 20, 60 * 60))) {
    return { message: "That's a lot of checkouts. Try again in an hour." };
  }

  const slug = String(fd.get("slug") ?? "");
  const orderId = `unp-${randomBytes(8).toString("hex")}`;
  const expiresAt = new Date(Date.now() + CHECKOUT_MINUTES * 60_000);

  const prepared = await db.transaction(async (tx) => {
    const [listing] = await tx.select().from(schema.listings).where(eq(schema.listings.slug, slug)).limit(1).for("update");
    if (!listing || listing.status !== "published" || listing.creatorId === user.id || !usesCashfree(listing)) {
      return { message: "This listing isn't available to buy." };
    }
    let variants: Map<string, string>;
    try {
      variants = fulfillmentVariants(listing);
    } catch (error) {
      await reportError({ where: "startCheckout", message: `QIKINK_CATALOG: ${String(error)}`, path: `/listing/${slug}` });
      return { message: SHIPPING_UNAVAILABLE };
    }
    if (shipsThroughQikink(listing) && !variants.size) return { message: SHIPPING_UNAVAILABLE };
    // Merchandise can be ordered again. Anything else is bought once.
    if (!variants.size) {
      const [owned] = await tx.select({ id: schema.orders.id }).from(schema.orders)
        .where(and(eq(schema.orders.listingId, listing.id), eq(schema.orders.buyerId, user.id), inArray(schema.orders.status, COMPLETED_ORDERS))).limit(1);
      if (owned) return { message: "You already own this." };
    }
    if (listing.license === "exclusive") {
      const [other] = await tx.select({ id: schema.payments.id }).from(schema.payments).where(and(
        eq(schema.payments.listingId, listing.id),
        eq(schema.payments.status, "created"),
        ne(schema.payments.buyerId, user.id),
        gt(schema.payments.createdAt, new Date(Date.now() - CHECKOUT_MINUTES * 60_000)),
      )).limit(1);
      if (other) return { message: `Someone else is paying for this exclusive listing right now. If they don't finish, it opens again within ${CHECKOUT_MINUTES} minutes.` };
    }
    const shipment = variants.size ? prepareShipment(variants, fd, phone, user.email, listing.currency) : null;
    if (typeof shipment === "string") return { message: shipment };
    await tx.insert(schema.payments).values({
      provider: "cashfree", providerOrderId: orderId, listingId: listing.id, buyerId: user.id,
      amountCents: listing.priceCents, currency: listing.currency,
      shipment, fulfillment: shipment ? "waiting" : null,
    });
    return { listing };
  });
  if (!prepared.listing) return { message: prepared.message };
  const { listing } = prepared;

  const site = siteUrl();
  // Send the buyer back to the address they're on (a preview or local port, say).
  // Next only runs server actions whose Origin matches the host, so this is our own site.
  const origin = (await headers()).get("origin");
  const returnBase = origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : site;
  try {
    const order = await createCashfreeOrder({
      orderId,
      amountCents: listing.priceCents,
      currency: listing.currency,
      customer: { id: user.id, name: user.name, email: user.email, phone },
      returnUrl: `${returnBase}/api/payments/cashfree/return?order_id=${orderId}`,
      notifyUrl: site.startsWith("https://") ? `${site}/api/payments/cashfree/webhook` : null,
      note: listing.title,
      expiresAt,
    });
    track(user, "checkout_started", {
      method: "cashfree",
      listing_id: listing.id,
      category: listing.category,
      amount: listing.priceCents / 100,
      currency: listing.currency,
      merch: Boolean(shipsThroughQikink(listing)),
    });
    return { session: { id: order.payment_session_id, mode: cashfreeMode() } };
  } catch (error) {
    await db.update(schema.payments).set({ status: "failed", fulfillment: null, shipment: null })
      .where(and(eq(schema.payments.providerOrderId, orderId), eq(schema.payments.status, "created")));
    await reportError({ where: "startCheckout", message: String(error), path: `/listing/${slug}` });
    return { message: "We couldn't open the payment page. Try again in a minute." };
  }
}
