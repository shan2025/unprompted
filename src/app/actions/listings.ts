"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { assess } from "@/lib/assess";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { hasPurchased } from "@/lib/data";
import { parseListingForm, type CreateState, type PreviewState } from "@/lib/listing-form";
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
  if (!(await getCurrentUser())) return { ok: false, errors: {}, message: "Your session expired. Log in again." };
  const parsed = await parseListingForm(fd, { requireAttestation: false });
  if (!parsed.values) return { ok: false, errors: parsed.errors };

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

  const coverFile = v.image ? await saveUpload(v.image.bytes, v.image.ext) : null;
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
    license: v.license,
    coverFile,
    status: score.needsReview ? "in_review" : "published",
    aiPercent: score.percent,
    aiLow: score.low,
    aiHigh: score.high,
    tier: score.tier,
    processVerified: score.processVerified,
    disclosure: v.disclosure,
    evidence: result.evidence,
    analysis: {
      score,
      previewSegments: result.preview?.segments ?? [],
      previewKind: result.preview?.kind ?? null,
      signals: result.preview?.signals ?? [],
      media: result.media,
      sources: result.sources,
      analyzedAt: new Date().toISOString(),
    },
  });

  redirect(`/listing/${slug}?created=1`);
}

export async function buyListing(slug: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listing/${slug}`)}`);

  const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.slug, slug)).limit(1);
  if (!listing || listing.status !== "published" || listing.creatorId === user.id) redirect(`/listing/${slug}`);
  if (await hasPurchased(listing.id, user.id)) redirect(`/listing/${slug}`);

  // Payment goes here. Until a provider is connected, orders are recorded as
  // demo purchases so the full flow can be exercised (see README).
  await db.insert(schema.orders).values({
    listingId: listing.id,
    buyerId: user.id,
    amountCents: listing.priceCents,
    status: "demo",
  });
  if (listing.license === "exclusive") {
    await db.update(schema.listings).set({ status: "sold" }).where(eq(schema.listings.id, listing.id));
  }
  redirect(`/listing/${slug}?purchased=1`);
}

export type FlagState = { ok?: boolean; message?: string } | null;

const FLAG_REASONS = ["undisclosed-ai", "stolen", "misleading", "other"] as const;

export async function flagListing(_prev: FlagState, fd: FormData): Promise<FlagState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Log in to report a listing." };

  const listingId = Number(fd.get("listingId"));
  const reason = String(fd.get("reason") ?? "");
  const details = String(fd.get("details") ?? "").trim().slice(0, 1000);
  if (!Number.isInteger(listingId) || !(FLAG_REASONS as readonly string[]).includes(reason)) {
    return { message: "Pick a reason." };
  }

  const [existing] = await db
    .select({ id: schema.flags.id })
    .from(schema.flags)
    .where(
      and(eq(schema.flags.listingId, listingId), eq(schema.flags.reporterId, user.id), eq(schema.flags.status, "open")),
    )
    .limit(1);
  if (existing) return { ok: true, message: "You've already reported this. A moderator will look at it." };

  await db.insert(schema.flags).values({
    listingId,
    reporterId: user.id,
    reason: reason as (typeof FLAG_REASONS)[number],
    details,
  });
  return { ok: true, message: "Thanks. A moderator will review this listing." };
}
