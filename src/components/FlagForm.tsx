"use client";

import { useActionState } from "react";
import { submitReport } from "@/app/actions/reports";

const REASONS = {
  listing: [
    ["undisclosed-ai", "Undisclosed AI use"],
    ["stolen", "Not the seller's work"],
    ["misleading", "Misleading listing"],
    ["other", "Something else"],
  ],
  post: [
    ["undisclosed-ai", "Undisclosed AI use"],
    ["stolen", "Not the author's work"],
    ["abusive", "Abusive or spam"],
    ["other", "Something else"],
  ],
  comment: [
    ["abusive", "Abusive or harassing"],
    ["misleading", "Spam or misleading"],
    ["undisclosed-ai", "AI-generated comment"],
    ["other", "Something else"],
  ],
} as const;

const LABELS = { listing: "Report this listing", post: "Report this post", comment: "Report" };

export function FlagForm({ target, id, compact }: { target: keyof typeof REASONS; id: number; compact?: boolean }) {
  const [state, action, pending] = useActionState(submitReport, null);

  if (state?.ok) return <p className={`text-ink-soft ${compact ? "text-xs" : "text-sm"}`}>{state.message}</p>;

  return (
    <details className={`group ${compact ? "text-xs" : "text-sm"}`}>
      <summary className="cursor-pointer list-none font-medium text-muted hover:text-ink group-open:text-ink">
        {LABELS[target]}
      </summary>
      <form action={action} className="mt-3 space-y-3 text-sm">
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="id" value={id} />
        <select name="reason" className="field" defaultValue={REASONS[target][0][0]} aria-label="Reason">
          {REASONS[target].map(([v, l]) => (
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
