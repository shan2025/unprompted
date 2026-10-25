"use client";

import { useActionState } from "react";
import { flagListing } from "@/app/actions/listings";

const REASONS = [
  ["undisclosed-ai", "Undisclosed AI use"],
  ["stolen", "Not the seller's work"],
  ["misleading", "Misleading listing"],
  ["other", "Something else"],
] as const;

export function FlagForm({ listingId }: { listingId: number }) {
  const [state, action, pending] = useActionState(flagListing, null);

  if (state?.ok) return <p className="text-sm text-ink-soft">{state.message}</p>;

  return (
    <details className="group text-sm">
      <summary className="cursor-pointer list-none font-medium text-muted hover:text-ink group-open:text-ink">
        Report this listing
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="listingId" value={listingId} />
        <select name="reason" className="field" defaultValue="undisclosed-ai" aria-label="Reason">
          {REASONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <textarea name="details" rows={3} className="field" placeholder="What did you notice? Links help." maxLength={1000} />
        {state?.message && <p className="text-sm font-medium text-heavy">{state.message}</p>}
        <button className="btn-ghost w-full" disabled={pending}>
          {pending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
