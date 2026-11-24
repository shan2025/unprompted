"use server";

import type { ProductPhoto, SavedPhoto } from "@/lib/product-photos";
import { parseCoverPattern, parseCoverTheme } from "@/lib/cover-themes";
import { publishDraft, PublicationConflict, type Transaction } from "@/lib/publishing";
import { hasDuplicateEvidence } from "@/lib/evidence";
import { isAutoEvidence } from "@/lib/post-form";
import { randomBytes } from "node:crypto";
import { and, eq, gt, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fulfillmentVariants } from "@/lib/qikink";
import { redirect } from "next/navigation";
import { assess, scoreColumns } from "@/lib/assess";
import { getCurrentUser } from "@/lib/auth";
import { sellsThroughCashfree } from "@/lib/checkout";
import { CLAIM_HOLD_DAYS, claimHoldCutoff } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { UNVERIFIED_MESSAGE } from "@/lib/email-verification";
import { siteUrl } from "@/lib/format";
import { announce } from "@/lib/indexnow";
import { MAX_EVIDENCE, parseListingForm, UNREADABLE_EVIDENCE, UNREADABLE_IMAGE, type CreateState, type PreviewState } from "@/lib/listing-form";
import { PAYMENT_LINK_HELP, parsePaymentLink } from "@/lib/payment-link";
import { withinLimit } from "@/lib/rate-limit";
import { deleteUploads, saveEvidenceFiles, saveUpload, saveWithUploads } from "@/lib/uploads";

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "work"}-${randomBytes(3).toString("hex")}`;
}

class UnreadableGalleryPhoto extends Error {}

async function saveProductPhotos(tx: Transaction, photos: ProductPhoto[]) {
  const saved: SavedPhoto[] = [];
  for (const photo of photos) {
    if ("file" in photo) {
      saved.push(photo);
    } else {
      const file = await saveUpload(photo.bytes, tx);
      if (!file) throw new UnreadableGalleryPhoto();
      saved.push({ file, media: photo.media });
    }
  }
  return { coverFile: saved[0]?.file ?? null, gallery: saved.slice(1) };
}

function photoAssessment(photos: ProductPhoto[]) {
  const [first, ...rest] = photos;
  return {
    image: first && "bytes" in first ? first.bytes : null,
    priorMedia: first && "file" in first ? first.media : null,
    galleryMedia: rest.map(photo => photo.media),
  };
}

async function loadListingEdit(fd: FormData, userId: number) {
  const slug = String(fd.get("editSlug") ?? "");
  if (!slug) return null;
  const [listing] = await db.select().from(schema.listings).where(and(eq(schema.listings.slug, slug), eq(schema.listings.creatorId, userId))).limit(1);
  if (!listing) return null;
  const indexes = new Set(fd.getAll("keep_evidence").map(Number));
  const kept = listing.evidence.filter((e, index) => !isAutoEvidence(e) && indexes.has(index));
  const photos = [...(listing.coverFile ? [{ file: listing.coverFile, media: listing.analysis.media }] : []), ...listing.gallery];
  return { listing, kept, photos };
}

export async function updateListing(_previous: CreateState, fd: FormData): Promise<CreateState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Log in again to edit this listing." };
  if (!user.verified) return { message: UNVERIFIED_MESSAGE };
  const edit = await loadListingEdit(fd, user.id);
  if (!edit) return { message: "This listing isn't available to edit." };
  if (fd.has("draftId") && fd.get("workVersion") !== edit.listing.analysis.analyzedAt) return { message: "This listing has a newer version. Open a fresh edit from the listing before resubmitting." };
  const parsed = await parseListingForm(fd, { requireAttestation: true, savedPhotos: edit.photos, gatewayCheckout: sellsThroughCashfree(user) });
  if (!parsed.values) return { errors: parsed.errors, message: "Some fields need attention." };
  const v = parsed.values;
  const allEvidence = [...v.evidence, ...edit.kept];
  if (allEvidence.length > MAX_EVIDENCE || hasDuplicateEvidence(allEvidence)) return { errors: { evidence: "Attach at most six different evidence sources. Remove repeated links or files." } };
  if (!(await withinLimit(`listing-edit:user:${user.id}`, 40, 86400))) return { message: "You've made many edits today. Try again tomorrow." };
  const result = await assess({ ...v, ...photoAssessment(v.photos), evidence: allEvidence });
  if (result.score.blocked) return { errors: { disclosure: "Disclosed AI use must be 50% or less." } };
  const evidence = await saveEvidenceFiles(result.evidence, v.evidenceFiles);
  if (!evidence) return { errors: { evidence: UNREADABLE_EVIDENCE } };
  try {
    await saveWithUploads(v.evidenceFiles.map((f) => evidence[f.index].file), () => publishDraft(fd, user.id, "listing", edit.listing.slug, async (tx) => {
      const [current] = await tx.select().from(schema.listings).where(and(eq(schema.listings.id, edit.listing.id), eq(schema.listings.creatorId, user.id))).for("update");
      if (!current || current.analysis.analyzedAt !== edit.listing.analysis.analyzedAt) throw new PublicationConflict("This listing changed while you were editing. Reload before resubmitting.");
      const [order] = await tx.select({ id: schema.orders.id }).from(schema.orders).where(and(eq(schema.orders.listingId, current.id), ne(schema.orders.status, "declined"))).limit(1);
      if (order || current.status === "sold") throw new PublicationConflict("This listing has orders. Its work and terms are protected for those buyers. You can withdraw it, or create a new listing for a new version.");
      await tx.update(schema.listings).set({
        productType: v.productType, ...await saveProductPhotos(tx, v.photos),
        title: v.title, category: v.category, summary: v.summary, preview: v.preview, locked: v.locked, aiNotes: v.aiNotes,
        priceCents: v.priceCents, currency: v.currency, paymentUrl: v.paymentUrl, license: v.license,
        coverTheme: parseCoverTheme(fd.get("cover_theme")), coverPattern: parseCoverPattern(fd.get("cover_pattern")),
        disclosure: v.disclosure, ...scoreColumns(result), evidence, evidenceReview: null,
        status: current.status === "removed" || current.status === "in_review" || Boolean(current.moderationReason) || result.score.needsReview ? "in_review" : "published",
      }).where(eq(schema.listings.id, current.id));
    }));
  } catch (error) {
    if (error instanceof UnreadableGalleryPhoto) return { errors: { gallery: UNREADABLE_IMAGE } };
    if (error instanceof PublicationConflict) return { message: error.message };
    throw error;
  }
  const used = new Set([...v.photos.flatMap(photo => "file" in photo ? [photo.file] : []), ...evidence.map(e => e.file)]);
  await deleteUploads([...edit.photos.map(photo => photo.file), ...edit.listing.evidence.map(e => e.file)].filter((name): name is string => Boolean(name) && !used.has(name))).catch(() => {});
  revalidatePath("/", "layout");
  announce([`/listing/${edit.listing.slug}`]);
  redirect(`/listing/${edit.listing.slug}?updated=1`);
}

/** Withdrawal closes new sales; all existing orders and buyer access remain. */
export async function withdrawListing(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const slug = String(fd.get("slug") ?? "");
  await db.transaction(async (tx) => {
    const [listing] = await tx.select().from(schema.listings).where(and(eq(schema.listings.slug, slug), eq(schema.listings.creatorId, user.id))).for("update");
    if (!listing || !["published", "in_review"].includes(listing.status)) return;
    await tx.update(schema.listings).set({ status: "withdrawn", moderationReason: listing.moderationReason || (listing.status === "in_review" ? "Review pending before withdrawal." : "") }).where(eq(schema.listings.id, listing.id));
  });
  revalidatePath("/", "layout");
  announce([`/listing/${slug}`]);
}

/** Score a draft without saving it, so creators can see the result first. */
export async function previewAssessment(fd: FormData): Promise<PreviewState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: {}, message: "Your session expired. Log in again." };
  const edit = await loadListingEdit(fd, user.id);
  const parsed = await parseListingForm(fd, { requireAttestation: false, savedPhotos: edit?.photos });
  if (!parsed.values) return { ok: false, errors: parsed.errors };
  if (!(await withinLimit(`preview:user:${user.id}`, 60, 60 * 60))) {
    return { ok: false, errors: {}, message: "That's a lot of score checks. Try again in an hour." };
  }

  const v = parsed.values;
  const result = await assess({ ...v, ...photoAssessment(v.photos), evidence: [...v.evidence, ...(edit?.kept ?? [])] });
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
  if (!user.verified) return { message: UNVERIFIED_MESSAGE };

  const parsed = await parseListingForm(fd, { requireAttestation: true, gatewayCheckout: sellsThroughCashfree(user) });
  if (!parsed.values) return { errors: parsed.errors, message: "Some fields need attention." };
  const v = parsed.values;

  const result = await assess({ ...v, ...photoAssessment(v.photos) });
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

  const evidence = await saveEvidenceFiles(result.evidence, v.evidenceFiles);
  if (!evidence) return { errors: { evidence: UNREADABLE_EVIDENCE }, message: "Some fields need attention." };
  const slug = slugify(v.title);

  try { await saveWithUploads(v.evidenceFiles.map((f) => evidence[f.index].file), () =>
    publishDraft(fd, user.id, "listing", "", async (tx) => tx.insert(schema.listings).values({
      slug,
      creatorId: user.id,
      title: v.title,
      category: v.category,
      productType: v.productType,
      ...await saveProductPhotos(tx, v.photos),
      summary: v.summary,
      preview: v.preview,
      locked: v.locked,
      aiNotes: v.aiNotes,
      priceCents: v.priceCents,
      currency: v.currency,
      paymentUrl: v.paymentUrl,
      license: v.license,
      coverTheme: parseCoverTheme(fd.get("cover_theme")),
      coverPattern: parseCoverPattern(fd.get("cover_pattern")),
      status: score.needsReview ? "in_review" : "published",
      disclosure: v.disclosure,
      ...scoreColumns(result),
      evidence,
    })),
  ); } catch (error) {
    if (error instanceof UnreadableGalleryPhoto) return { errors: { gallery: UNREADABLE_IMAGE } };
    if (error instanceof PublicationConflict) return { message: error.message };
    throw error;
  }

  // Ask Bing and others to crawl it now, if it went live straight away.
  if (!score.needsReview) announce([`/listing/${slug}`, `/u/${user.handle}`]);
  revalidatePath("/admin/merch");
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
      .values({ listingId: listing.id, buyerId: user.id, amountCents: listing.priceCents, currency: listing.currency, status: listing.isDemo ? "demo" : "paid" })
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

async function notify(to: string | null, subject: string, lines: string[], path: string) {
  // phone-only accounts have no email; they see the order on their dashboard instead.
  if (!to) return;
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
    if (fulfillmentVariants(listing).size) return { message: "Use this product’s shipping checkout." };
    if (listing.license === "exclusive") {
      // A claim the seller hasn't answered in CLAIM_HOLD_DAYS stops holding the listing.
      const [other] = await tx
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(
          and(
            eq(schema.orders.listingId, listing.id),
            eq(schema.orders.status, "pending"),
            ne(schema.orders.buyerId, user.id),
            gt(schema.orders.createdAt, claimHoldCutoff()),
          ),
        )
        .limit(1);
      if (other) {
        return {
          message: `Someone else is already waiting on this exclusive listing. If the seller hasn't confirmed it within ${CLAIM_HOLD_DAYS} days, you can try again. If you've paid, ask the seller for a refund.`,
        };
      }
    }
    const [order] = await tx
      .insert(schema.orders)
      .values({ listingId: listing.id, buyerId: user.id, amountCents: listing.priceCents, currency: listing.currency, status: "pending", paymentReference: reference })
      // A declined buyer can try again. Anything else already stands. The claim's
      // date restarts, since it's what the hold on an exclusive listing counts from.
      .onConflictDoUpdate({
        target: [schema.orders.listingId, schema.orders.buyerId],
        set: { status: "pending", amountCents: listing.priceCents, currency: listing.currency, paymentReference: reference, createdAt: new Date() },
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

    // An exclusive listing goes to the buyer whose payment the seller confirms.
    // Anyone else still waiting on it is turned down, so nobody waits forever.
    let outbid: number[] = [];
    if (decision === "paid" && listing.license === "exclusive") {
      if (listing.status === "published") {
        await tx.update(schema.listings).set({ status: "sold" }).where(eq(schema.listings.id, listing.id));
      }
      const others = await tx
        .update(schema.orders)
        .set({ status: "declined" })
        .where(and(eq(schema.orders.listingId, listing.id), eq(schema.orders.status, "pending")))
        .returning({ buyerId: schema.orders.buyerId });
      outbid = others.map((o) => o.buyerId);
    }
    return { buyerId: order.buyerId, title: listing.title, slug: listing.slug, outbid };
  });
  if (!result) return;

  if (result.outbid.length) {
    const others = await db.select({ email: schema.users.email }).from(schema.users).where(inArray(schema.users.id, result.outbid));
    for (const other of others) {
      await notify(
        other.email,
        `"${result.title}" was sold to someone else`,
        [
          `"${result.title}" was an exclusive listing, and the seller confirmed another buyer's payment first.`,
          "If you paid for it, contact the seller for a refund. If they don't respond, contact us.",
        ],
        `/listing/${result.slug}`,
      );
    }
  }

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
  revalidatePath("/admin/merch");
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
