"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assess, scoreColumns } from "@/lib/assess";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";
import { parseListingForm, UNREADABLE_IMAGE, type CreateState, type PreviewState } from "@/lib/listing-form";
import { PAYMENT_LINK_HELP, parsePaymentLink } from "@/lib/payment-link";
import { withinLimit } from "@/lib/rate-limit";
import { saveUpload } from "@/lib/uploads";

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "work"}-${randomBytes(3).toString("hex")}`;
}

/** Score a draft without saving it, so creators can see the result first. */
export async function previewAssessment(fd: FormData): Promise<PreviewState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: {}, message: "Your session expired. Log in again." };
  const parsed = await parseListingForm(fd, { requireAttestation: false });
  if (!parsed.values) return { ok: false, errors: parsed.errors };
  if (!(await withinLimit(`preview:user:${user.id}`, 60, 60 * 60))) {
    return { ok: false, errors: {}, message: "That's a lot of score checks. Try again in an hour." };
  }

  const v = parsed.values;
  const result = await assess({ ...v, image: v.image?.bytes });
  return {
    ok: true,
    result: {
      score: result.score,
      previewText: v.preview,
      previewKind: result.preview?.kind ?? null,
      segments: result.preview?.segments ?? [],
      signals: result.preview?.signals ?? [],
      media: result.media,
      sources: result.sources,
    },
  };
}

export async function createListing(_prev: CreateState, fd: FormData): Promise<CreateState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };

  const parsed = await parseListingForm(fd, { requireAttestation: true });
  if (!parsed.values) return { errors: parsed.errors, message: "Some fields need attention." };
  const v = parsed.values;

  const result = await assess({ ...v, image: v.image?.bytes });
  const { score } = result;
  if (score.blocked) {
    return {
      errors: { disclosure: "Unprompters only lists work that is at least half human-made." },
      message: `Your disclosure works out to ${score.disclosedPercent}% AI, above the 50% limit.`,
    };
  }

  if (!(await withinLimit(`listing:user:${user.id}`, 20, 24 * 60 * 60))) {
    return { message: "You've reached the limit of 20 new listings a day. Try again tomorrow." };
  }

  const coverFile = v.image ? await saveUpload(v.image.bytes) : null;
  if (v.image && !coverFile) return { errors: { cover: UNREADABLE_IMAGE }, message: "Some fields need attention." };
  const slug = slugify(v.title);

  await db.insert(schema.listings).values({
    slug,
    creatorId: user.id,
    title: v.title,
    category: v.category,
    summary: v.summary,
    preview: v.preview,
    locked: v.locked,
    aiNotes: v.aiNotes,
    priceCents: v.priceCents,
    paymentUrl: v.paymentUrl,
    license: v.license,
    coverFile,
    status: score.needsReview ? "in_review" : "published",
    disclosure: v.disclosure,
    ...scoreColumns(result),
  });

  redirect(`/listing/${slug}?created=1`);
}

/** Free and seeded demo listings unlock at once. Anything else goes through claimPayment. */
export async function buyListing(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listing/${slug}`)}`);

  // Lock the listing row for the purchase, so two buyers arriving at once
  // can't both take an exclusive license: the second waits, then sees "sold".
  const bought = await db.transaction(async (tx) => {
    const [listing] = await tx
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.slug, slug))
      .limit(1)
      .for("update");
    if (!listing || listing.status !== "published" || listing.creatorId === user.id) return false;
    if (listing.priceCents > 0 && !listing.isDemo) return false;

    const [order] = await tx
      .insert(schema.orders)
      .values({ listingId: listing.id, buyerId: user.id, amountCents: listing.priceCents, status: listing.isDemo ? "demo" : "paid" })
      // Already bought by this user (orders_listing_buyer_idx).
      .onConflictDoNothing()
      .returning({ id: schema.orders.id });
    if (!order) return false;

    if (listing.license === "exclusive") {
      await tx.update(schema.listings).set({ status: "sold" }).where(eq(schema.listings.id, listing.id));
    }
    return true;
  });
  redirect(bought ? `/listing/${slug}?purchased=1` : `/listing/${slug}`);
}

async function notify(to: string, subject: string, lines: string[], path: string) {
  const link = `${siteUrl()}${path}`;
  await sendEmail({
    to,
    subject,
    text: `${lines.join("\n\n")}\n\n${link}\n\nUnprompters`,
    html: `${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("")}<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><p>Unprompters</p>`,
  });
}

export type PaymentState = { message?: string; ok?: boolean } | null;

/** The buyer says they've paid. The work stays locked until the seller confirms it. */
export async function claimPayment(_prev: PaymentState, fd: FormData): Promise<PaymentState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };

  const slug = String(fd.get("slug") ?? "");
  const reference = String(fd.get("reference") ?? "").trim();
  if (reference.length < 3 || reference.length > 120) {
    return { message: "Enter the transaction ID or name on the payment, so the seller can find it." };
  }
  if (!(await withinLimit(`claim:user:${user.id}`, 10, 60 * 60))) {
    return { message: "That's a lot of payment claims. Try again in an hour." };
  }

  // Locked so two buyers can't both be waiting on one exclusive listing.
  const result = await db.transaction(async (tx) => {
    const [listing] = await tx
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.slug, slug))
      .limit(1)
      .for("update");
    if (!listing || listing.status !== "published" || listing.creatorId === user.id || !listing.paymentUrl) {
      return { message: "This listing isn't available to buy." };
    }
    if (listing.license === "exclusive") {
      const [other] = await tx
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(and(eq(schema.orders.listingId, listing.id), eq(schema.orders.status, "pending")))
        .limit(1);
      if (other) return { message: "Someone else is already waiting on this exclusive listing. If you've paid, ask the seller for a refund." };
    }
    const [order] = await tx
      .insert(schema.orders)
      .values({ listingId: listing.id, buyerId: user.id, amountCents: listing.priceCents, status: "pending", paymentReference: reference })
      // A declined buyer can try again. Anything else already stands.
      .onConflictDoUpdate({
        target: [schema.orders.listingId, schema.orders.buyerId],
        set: { status: "pending", amountCents: listing.priceCents, paymentReference: reference },
        setWhere: eq(schema.orders.status, "declined"),
      })
      .returning({ id: schema.orders.id });
    if (!order) return { message: "You've already told the seller about this order." };
    return { title: listing.title, creatorId: listing.creatorId };
  });
  if (result.message) return { message: result.message };

  const [seller] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, result.creatorId!)).limit(1);
  if (seller) {
    await notify(
      seller.email,
      `Check a payment for "${result.title}"`,
      [`${user.name} (@${user.handle}) says they've paid for "${result.title}".`, `Their payment reference: ${reference}`, "Check that the money arrived, then mark the order as paid on your dashboard to unlock the work for them."],
      "/dashboard",
    );
  }
  redirect(`/listing/${slug}?claimed=1`);
}

/** The seller, who can see the money, marks a waiting order as paid or declines it. */
export async function reviewOrder(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "paid" && decision !== "declined")) return;

  const result = await db.transaction(async (tx) => {
    const [found] = await tx.select({ listingId: schema.orders.listingId }).from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
    if (!found) return null;
    const [listing] = await tx
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, found.listingId))
      .limit(1)
      .for("update");
    if (!listing || listing.creatorId !== user.id) return null;

    const [order] = await tx
      .update(schema.orders)
      .set({ status: decision })
      .where(and(eq(schema.orders.id, id), eq(schema.orders.status, "pending")))
      .returning({ buyerId: schema.orders.buyerId });
    if (!order) return null;

    if (decision === "paid" && listing.license === "exclusive" && listing.status === "published") {
      await tx.update(schema.listings).set({ status: "sold" }).where(eq(schema.listings.id, listing.id));
    }
    return { buyerId: order.buyerId, title: listing.title, slug: listing.slug };
  });
  if (!result) return;

  const [buyer] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, result.buyerId)).limit(1);
  if (buyer) {
    await notify(
      buyer.email,
      decision === "paid" ? `"${result.title}" is unlocked` : `Your payment for "${result.title}" wasn't confirmed`,
      decision === "paid"
        ? [`The seller confirmed your payment for "${result.title}". It's unlocked and ready for you.`]
        : [`The seller couldn't confirm your payment for "${result.title}".`, "If you did pay, check your payment reference and send it again from the listing, or contact us."],
      `/listing/${result.slug}`,
    );
  }
  revalidatePath("/dashboard");
}

export async function updatePaymentLink(_prev: PaymentState, fd: FormData): Promise<PaymentState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };

  const slug = String(fd.get("slug") ?? "");
  const paymentUrl = parsePaymentLink(String(fd.get("paymentUrl") ?? ""));
  if (!paymentUrl) return { message: PAYMENT_LINK_HELP };

  const [updated] = await db
    .update(schema.listings)
    .set({ paymentUrl })
    .where(and(eq(schema.listings.slug, slug), eq(schema.listings.creatorId, user.id)))
    .returning({ id: schema.listings.id });
  if (!updated) return { message: "This isn't your listing." };

  revalidatePath(`/listing/${slug}`);
  return { ok: true, message: "Saved. Buyers now pay through this link." };
}
