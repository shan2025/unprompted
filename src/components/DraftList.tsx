import Link from "next/link";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { discardWorkDraft } from "@/app/actions/drafts";
import { db, schema } from "@/lib/db";
import { draftHref } from "@/lib/drafts";
import { SubmitButton } from "./SubmitButton";

/** Called only from the authenticated dashboard with its session user's id. */
export async function DraftList({ userId }: { userId: number }) {
  const table = schema.workDrafts;
  const drafts = await db.select({
    id: table.id,
    kind: table.kind,
    targetSlug: table.targetSlug,
    updatedAt: table.updatedAt,
    title: sql<string | null>`(
      select entry ->> 1 from jsonb_array_elements(${table.payload} -> 'fields') as entry
      where entry ->> 0 = 'title' limit 1
    )`,
  }).from(table)
    .where(and(eq(table.userId, userId), isNull(table.completedAt), gt(table.version, 0)))
    .orderBy(desc(table.updatedAt));
  if (!drafts.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-normal">Private drafts</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {drafts.map((draft) => (
          <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <Link href={draftHref(draft)} className="link break-words font-semibold">{draft.title || "Untitled draft"}</Link>
              <p className="mt-1 text-xs text-muted">
                {draft.kind === "post" ? "Journal post" : "Listing"}{draft.targetSlug ? " · revision" : ""} · {draft.updatedAt.toLocaleDateString("en-US", { timeZone: "UTC" })}
              </p>
            </div>
            <details>
              <summary className="cursor-pointer text-sm text-muted">Discard…</summary>
              <form action={discardWorkDraft} className="mt-2">
                <input type="hidden" name="id" value={draft.id} />
                <SubmitButton className="btn-ghost text-heavy">Discard this private draft</SubmitButton>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
