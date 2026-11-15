"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { draftPayload, EMPTY_DRAFT, type DraftKind, type WorkDraft } from "@/lib/drafts";
import { withinLimit } from "@/lib/rate-limit";

export async function openWorkDraft(kind: DraftKind, targetSlug: string, id?: string): Promise<WorkDraft | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in again to load your draft." };
  if ((kind !== "post" && kind !== "listing") || typeof targetSlug !== "string" || targetSlug.length > 100) return { error: "Invalid draft." };
  if (targetSlug) {
    const table = kind === "post" ? schema.posts : schema.listings;
    const owner = kind === "post" ? schema.posts.authorId : schema.listings.creatorId;
    const [work] = await db.select({ id: table.id }).from(table).where(and(eq(table.slug, targetSlug), eq(owner, user.id))).limit(1);
    if (!work) return { error: "This work isn't available to edit." };
  }
  if (id) {
    const [draft] = await db.select().from(schema.workDrafts).where(and(eq(schema.workDrafts.id, id), eq(schema.workDrafts.userId, user.id), eq(schema.workDrafts.kind, kind), eq(schema.workDrafts.targetSlug, targetSlug), isNull(schema.workDrafts.completedAt))).limit(1);
    if (!draft) return { error: "This draft is no longer available. Open your dashboard to continue." };
    return { ...draft, updatedAt: draft.updatedAt.toISOString() };
  }
  if (!(await withinLimit(`draft:new:${user.id}`, 50, 86400))) return { error: "You've started many drafts today. Resume one from your dashboard." };
  const [draft] = await db.insert(schema.workDrafts).values({ id: randomUUID(), userId: user.id, kind, targetSlug, payload: EMPTY_DRAFT }).returning();
  return { ...draft, updatedAt: draft.updatedAt.toISOString() };
}

export async function saveWorkDraft(id: string, version: number, form: FormData): Promise<{ version: number; savedAt: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your session expired. Your recovery copy is on this device; log in again to save online." };
  if (typeof id !== "string" || !Number.isSafeInteger(version) || version < 0) return { error: "Invalid draft." };
  if (!(await withinLimit(`draft:save:${user.id}`, 240, 3600))) return { error: "Too many saves. Your recovery copy remains on this device; try again later." };
  let payload;
  try { payload = await draftPayload(form); } catch (error) { return { error: (error as Error).message }; }
  const [saved] = await db.update(schema.workDrafts).set({ payload, version: sql`${schema.workDrafts.version} + 1`, updatedAt: new Date() })
    .where(and(eq(schema.workDrafts.id, id), eq(schema.workDrafts.userId, user.id), eq(schema.workDrafts.version, version), isNull(schema.workDrafts.completedAt)))
    .returning({ version: schema.workDrafts.version, savedAt: schema.workDrafts.updatedAt });
  if (!saved) return { error: "This draft changed in another tab or was already published. Your recovery copy is kept. Reload to compare before continuing." };
  return { version: saved.version, savedAt: saved.savedAt.toISOString() };
}

export async function discardWorkDraft(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(schema.workDrafts).set({ completedAt: new Date(), payload: EMPTY_DRAFT }).where(and(eq(schema.workDrafts.id, String(form.get("id") ?? "")), eq(schema.workDrafts.userId, user.id)));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard");
}
