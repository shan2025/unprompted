"use client";

import { useActionState } from "react";
import { reviewProcessEvidence } from "@/app/actions/admin";
import type { EvidenceReview as Review } from "@/lib/evidence";

export function EvidenceReview({ kind, id, analyzedAt, review, isAdmin }: { kind: "post" | "listing"; id: number; analyzedAt: string; review: Review | null; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(reviewProcessEvidence, null);
  return <div className="mt-5 border-t border-line pt-4 text-sm">
    <p className="font-semibold">{review ? "Process evidence reviewed by a moderator" : "Creator-supplied evidence · not reviewed"}</p>
    {review && <><p className="mt-1 text-ink-soft">{review.note}</p><p className="mt-1 text-xs text-muted">Reviewed {new Date(review.reviewedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}. This records a human review, not a guarantee of authorship.</p></>}
    {!review && <p className="mt-1 text-ink-soft">These attachments do not establish authorship or change the AI score.</p>}
    {isAdmin && <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} /><input type="hidden" name="analyzedAt" value={analyzedAt} />
      <label className="label">Review note<textarea name="note" className="field mt-2" rows={3} maxLength={1000} placeholder="Describe the sources you checked, how they relate to this work, and any limitations." /></label>
      <label className="flex items-start gap-2"><input type="checkbox" name="checked" className="mt-1" />I opened the evidence and checked its relevance to this version of the work.</label>
      {state?.message && <p role="status" className="text-ink-soft">{state.message}</p>}
      <div className="flex flex-wrap gap-2"><button name="decision" value="review" className="btn-primary" disabled={pending}>Record evidence review</button>{review && <button name="decision" value="revoke" className="btn-ghost" disabled={pending}>Revoke review</button>}</div>
    </form>}
  </div>;
}
