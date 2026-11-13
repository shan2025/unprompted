"use client";

import { useActionState } from "react";
import { featureWork, setFounding, type CurationState } from "@/app/actions/admin";

function Result({ state }: { state: CurationState }) {
  if (state?.error) return <p className="text-sm font-medium text-heavy">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-ink-soft">{state.ok}</p>;
  return null;
}

/** Give the Founding Unprompter badge by handle. Removing is a button on each name in the list. */
export function FoundingForm() {
  const [state, action, pending] = useActionState(setFounding, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input name="handle" className="field min-w-0 flex-1" placeholder="@handle" aria-label="Handle" required autoComplete="off" />
        <button className="btn-primary" disabled={pending}>
          Add badge
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

/** Feature a post or listing by pasting its link. */
export function FeatureForm() {
  const [state, action, pending] = useActionState(featureWork, undefined);
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          name="link"
          className="field min-w-0 flex-1"
          placeholder="https://unprompters.com/journal/… or /listing/…"
          aria-label="Link to the work"
          required
          autoComplete="off"
        />
        <button className="btn-primary" disabled={pending}>
          Feature
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}
