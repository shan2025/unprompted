"use client";

import { useActionState, useEffect, useState } from "react";
import { startCheckout } from "@/app/actions/checkout";

type CashfreeSdk = (options: { mode: "sandbox" | "production" }) => {
  checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Cashfree?: CashfreeSdk;
  }
}

const SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

/** Loads Cashfree's checkout script once, the first time someone pays. */
function loadSdk(): Promise<CashfreeSdk> {
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  return new Promise((resolve, reject) => {
    const script = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`) ?? Object.assign(document.createElement("script"), { src: SDK_URL, async: true });
    script.addEventListener("load", () => (window.Cashfree ? resolve(window.Cashfree) : reject(new Error("Cashfree didn't load"))));
    script.addEventListener("error", () => reject(new Error("Cashfree didn't load")));
    if (!script.isConnected) document.head.append(script);
  });
}

export function CashfreeCheckout({ slug, label, askPhone }: { slug: string; label: string; askPhone: boolean }) {
  const [state, action, pending] = useActionState(startCheckout, null);
  // The checkout session that couldn't be opened, if any. Any other session is still opening.
  const [failed, setFailed] = useState<string | null>(null);
  const session = state?.session;
  const showPhone = askPhone || Boolean(state?.needsPhone);
  const opening = Boolean(session) && failed !== session?.id;
  const sdkError = session && failed === session.id ? "The payment page didn't open. Check your connection and try again." : null;

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    loadSdk()
      .then((Cashfree) => Cashfree({ mode: session.mode }).checkout({ paymentSessionId: session.id, redirectTarget: "_self" }))
      .then((result) => {
        if (result?.error) throw new Error(result.error.message);
      })
      .catch(() => {
        if (!cancelled) setFailed(session.id);
      });
    return () => { cancelled = true; };
  }, [session]);

  const busy = pending || opening;
  const message = sdkError ?? state?.message;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      {showPhone && (
        <label className="block text-sm font-semibold">
          Mobile number
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required className="field mt-1 font-normal" placeholder="98765 43210" />
          <span className="mt-1 block text-xs font-normal text-muted">The payment gateway needs one for your receipt. Add the country code if it&apos;s outside India.</span>
        </label>
      )}
      <button className="btn-accent w-full py-3 text-[15px]" disabled={busy}>
        {busy ? "Opening secure checkout…" : label}
      </button>
      {message && <p role="alert" className="text-sm font-medium text-heavy">{message}</p>}
      <p className="text-xs leading-relaxed text-muted">Pay by UPI, card, net banking or wallet on Cashfree&apos;s secure checkout. The work unlocks here as soon as the payment goes through.</p>
    </form>
  );
}
