"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { announce } from "@/lib/indexnow";
import { parseWorkLink } from "@/lib/work-link";
import { hasDuplicateEvidence } from "@/lib/evidence";

// revalidatePath rather than refresh(): in testing on Next 16.4, refresh()
// didn't update the queue when the page had been opened with a full load.

export async function reviewListing(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "approve" && decision !== "remove")) return;
  const changed = await db
    .update(schema.listings)
    .set({ status: decision === "approve" ? "published" : "removed", moderationReason: decision === "approve" ? "" : String(fd.get("reason") ?? "").trim().slice(0, 1000) || "A moderator removed this work. Revise your work or evidence and resubmit for review." })
    .where(and(eq(schema.listings.id, id), eq(schema.listings.status, "in_review"), sql`${schema.listings.analysis}->>'analyzedAt' = ${String(fd.get("analyzedAt") ?? "")}`))
    .returning({ slug: schema.listings.slug });
  // Now live, or now gone: either way search engines should look again.
  announce(changed.map((l) => `/listing/${l.slug}`));
  revalidatePath("/admin");
}

export async function reviewPost(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "approve" && decision !== "remove")) return;
  const changed = await db
    .update(schema.posts)
    .set({ status: decision === "approve" ? "published" : "removed", moderationReason: decision === "approve" ? "" : String(fd.get("reason") ?? "").trim().slice(0, 1000) || "A moderator removed this work. Revise your work or evidence and resubmit for review." })
    .where(and(eq(schema.posts.id, id), eq(schema.posts.status, "in_review"), sql`${schema.posts.analysis}->>'analyzedAt' = ${String(fd.get("analyzedAt") ?? "")}`))
    .returning({ slug: schema.posts.slug });
  announce(changed.map((p) => `/journal/${p.slug}`));
  revalidatePath("/admin");
}

// Founding Unprompters and featured work. Both change what the public sees
// on profiles, cards and the home page, so those are refreshed too.
function refreshPublic() {
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export type CurationState = { error?: string; ok?: string } | undefined;

/** Gives the Founding Unprompter badge, by handle. */
export async function setFounding(_prev: CurationState, fd: FormData): Promise<CurationState> {
  await requireAdmin();
  const handle = String(fd.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { error: "Enter a handle." };
  const [user] = await db
    .update(schema.users)
    .set({ founding: true })
    .where(eq(schema.users.handle, handle))
    .returning({ name: schema.users.name });
  if (!user) return { error: `No one has the handle @${handle}.` };
  refreshPublic();
  return { ok: `${user.name} is now a Founding Unprompter.` };
}

export async function removeFounding(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  await db.update(schema.users).set({ founding: false }).where(eq(schema.users.id, id));
  refreshPublic();
}

/** Puts a published post or listing in the home page's Featured row. */
export async function featureWork(_prev: CurationState, fd: FormData): Promise<CurationState> {
  await requireAdmin();
  const work = parseWorkLink(String(fd.get("link") ?? ""));
  if (!work) return { error: "Paste a link to a journal post or a listing, like /journal/my-post." };
  const now = new Date();
  const [row] =
    work.kind === "post"
      ? await db
          .update(schema.posts)
          .set({ featuredAt: now })
          .where(and(eq(schema.posts.slug, work.slug), eq(schema.posts.status, "published")))
          .returning({ title: schema.posts.title })
      : await db
          .update(schema.listings)
          .set({ featuredAt: now })
          .where(and(eq(schema.listings.slug, work.slug), inArray(schema.listings.status, ["published", "sold"])))
          .returning({ title: schema.listings.title });
  if (!row) return { error: "No published work at that link." };
  refreshPublic();
  return { ok: `Featured “${row.title}”.` };
}

export async function unfeatureWork(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const kind = fd.get("kind");
  if (!Number.isInteger(id) || (kind !== "post" && kind !== "listing")) return;
  if (kind === "post") await db.update(schema.posts).set({ featuredAt: null }).where(eq(schema.posts.id, id));
  else await db.update(schema.listings).set({ featuredAt: null }).where(eq(schema.listings.id, id));
  refreshPublic();
}

/** Upholding a report removes whatever it points at: a listing, a post or a comment. */
export async function resolveFlag(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "dismiss" && decision !== "uphold")) return;

  const [flag] = await db.select().from(schema.flags).where(eq(schema.flags.id, id)).limit(1);
  if (!flag) return;
  await db
    .update(schema.flags)
    .set({ status: decision === "uphold" ? "upheld" : "dismissed" })
    .where(eq(schema.flags.id, id));
  if (decision === "uphold") {
    if (flag.listingId !== null) {
      await db.update(schema.listings).set({ status: "removed" }).where(eq(schema.listings.id, flag.listingId));
    } else if (flag.postId !== null) {
      await db.update(schema.posts).set({ status: "removed" }).where(eq(schema.posts.id, flag.postId));
    } else if (flag.commentId !== null) {
      await db.update(schema.postComments).set({ status: "removed" }).where(eq(schema.postComments.id, flag.commentId));
    }
  }
  revalidatePath("/admin");
}

export async function reviewProcessEvidence(_previous: { message: string } | null, form: FormData): Promise<{ message: string }> {
  const admin = await requireAdmin();
  const kind = form.get("kind"), id = Number(form.get("id")), decision = form.get("decision");
  if ((kind !== "post" && kind !== "listing") || !Number.isSafeInteger(id) || (decision !== "review" && decision !== "revoke")) return { message: "Invalid review." };
  const note = String(form.get("note") ?? "").trim();
  if (decision === "review" && (note.length < 20 || note.length > 1000 || form.get("checked") !== "on")) return { message: "Check the evidence and write a review note of 20–1,000 characters." };
  const table = kind === "post" ? schema.posts : schema.listings;
  const result = await db.transaction(async (tx) => {
    const [work] = await tx.select().from(table).where(eq(table.id, id)).for("update");
    if (!work || work.analysis.analyzedAt !== form.get("analyzedAt")) return { message: "This work changed. Reload and check the current evidence before reviewing." };
    if (decision === "review" && (!work.evidence.some((e) => e.kind !== "c2pa" && (e.file || e.url)) || hasDuplicateEvidence(work.evidence))) return { message: "This work needs distinct, accessible evidence sources before a review can be recorded." };
    const reviewed = decision === "review";
    await tx.update(table).set({ evidenceReview: reviewed ? { reviewerId: admin.id, reviewedAt: new Date().toISOString(), note } : null, processVerified: reviewed,
      analysis: { ...work.analysis, score: { ...work.analysis.score, processVerified: reviewed } },
    }).where(eq(table.id, id));
    return { message: reviewed ? "Evidence review recorded. The numeric score is unchanged." : "Evidence review revoked." };
  });
  revalidatePath("/", "layout");
  return result;
}
