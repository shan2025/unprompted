"use client";

import { useActionState } from "react";
import { resendVerification } from "@/app/actions/auth";

/** Sends a new confirmation link. Used in the banner and on pages that need a confirmed email. */
export function ResendVerification({ className = "btn-ghost" }: { className?: string }) {
  const [state, action, pending] = useActionState(resendVerification, null);
  if (state?.ok) return <span className="text-sm text-ink-soft">{state.message}</span>;
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-3">
      <button className={className} disabled={pending}>
        {pending ? "Sending…" : "Send a new link"}
      </button>
      {state?.message && <span className="text-sm font-medium text-heavy">{state.message}</span>}
    </form>
  );
}
