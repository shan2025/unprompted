"use client";

import { useActionState } from "react";
import { claimPayment, updatePaymentLink } from "@/app/actions/listings";

export function ClaimPaymentForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(claimPayment, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <label className="block text-sm font-semibold">
        Paid? Tell the seller
        <input name="reference" className="field mt-1 font-normal" maxLength={120} placeholder="Transaction ID or name on the payment" />
      </label>
      {state?.message && <p className="text-sm font-medium text-heavy">{state.message}</p>}
      <button className="btn-ghost w-full" disabled={pending}>
        {pending ? "Sending…" : "I've paid"}
      </button>
      <p className="text-xs leading-relaxed text-muted">The seller checks the payment, then the work unlocks here.</p>
    </form>
  );
}

export function PaymentLinkForm({ slug, current }: { slug: string; current: string | null }) {
  const [state, action, pending] = useActionState(updatePaymentLink, null);
  return (
    <details className="mt-3 text-sm" open={!current}>
      <summary className="cursor-pointer list-none font-medium text-muted hover:text-ink">
        {current ? "Change your payment link" : "Add a payment link so buyers can pay you"}
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="slug" value={slug} />
        <input name="paymentUrl" className="field" defaultValue={current ?? ""} placeholder="https://rzp.io/… or upi://pay?pa=…" aria-label="Payment link" />
        {state?.message && <p className={`text-sm font-medium ${state.ok ? "text-human" : "text-heavy"}`}>{state.message}</p>}
        <button className="btn-ghost w-full" disabled={pending}>
          {pending ? "Saving…" : "Save link"}
        </button>
      </form>
    </details>
  );
}
