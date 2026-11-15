import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { EMPTY_DRAFT, type DraftKind } from "./drafts";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class PublicationConflict extends Error {}

/** Lock the saved version through publication. A stale tab cannot publish twice. */
export async function publishDraft(form: FormData, userId: number, kind: DraftKind, targetSlug: string, write: (tx: Transaction) => Promise<unknown>) {
  return db.transaction(async (tx) => {
    const id = String(form.get("draftId") ?? "");
    if (id) {
      const [draft] = await tx.select().from(schema.workDrafts).where(and(eq(schema.workDrafts.id, id), eq(schema.workDrafts.userId, userId), eq(schema.workDrafts.kind, kind), eq(schema.workDrafts.targetSlug, targetSlug), isNull(schema.workDrafts.completedAt))).for("update");
      if (!draft || draft.version !== Number(form.get("draftVersion"))) throw new PublicationConflict("This draft changed or was already published. Reload your dashboard before continuing.");
    }
    await write(tx);
    if (id) await tx.update(schema.workDrafts).set({ completedAt: new Date(), payload: EMPTY_DRAFT }).where(eq(schema.workDrafts.id, id));
  });
}
