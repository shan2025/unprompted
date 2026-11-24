"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteMyAccount } from "@/app/actions/account";

/** The last section of Edit profile. Folded shut, and it asks for the profile handle before anything goes. */
export function DeleteAccount({ handle, blocker, soldListings }: { handle: string; blocker: string | null; soldListings: number }) {
  const [state, action, pending] = useActionState(deleteMyAccount, null);
  return (
    <section id="delete-account" className="mt-12 scroll-mt-8 border-t border-line pt-8 pb-16">
      <details className="max-w-xl">
        <summary className="cursor-pointer text-2xl font-normal">Delete your account</summary>
        <div className="mt-4 space-y-3 text-sm text-ink-soft">
          <p>This can&apos;t be undone. As soon as you confirm, we delete:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>your profile, photo, links, email address and phone number</li>
            <li>your posts and unsold listings, with their comments, images and evidence</li>
            <li>your comments, appreciations, follows, chat messages, questions, reports and drafts</li>
          </ul>
          <p>
            {soldListings > 0 && <>{soldListings === 1 ? "One listing has" : `${soldListings} listings have`} buyers, so {soldListings === 1 ? "it stays" : "they stay"} withdrawn from the market for the people who bought {soldListings === 1 ? "it" : "them"}. </>}
            Records of sales and purchases stay for the other person and for tax law, under &ldquo;Deleted account&rdquo; with no contact details. See the{" "}
            <Link href="/privacy" className="link">privacy policy</Link>.
          </p>
          {blocker ? (
            <p role="alert" className="rounded-lg bg-paper px-4 py-3 font-medium text-ink">{blocker}{" "}
              {blocker.includes("dashboard") ? <Link href="/dashboard#pending-orders" className="link">Open your dashboard</Link> : <Link href="/contact" className="link">Contact us</Link>}
            </p>
          ) : (
            <form action={action} className="space-y-3 pt-2">
              <label className="block font-semibold text-ink">
                Type <span className="font-mono">{handle}</span> to confirm
                <input name="confirm" className="field mt-1" autoComplete="off" autoCapitalize="none" spellCheck={false} required />
              </label>
              <button type="submit" disabled={pending} className="rounded-lg border border-heavy px-5 py-2.5 font-semibold text-heavy hover:bg-heavy hover:text-white disabled:opacity-60">
                {pending ? "Deleting…" : "Delete my account"}
              </button>
              {state?.message && <p role="alert" className="font-medium text-heavy">{state.message}</p>}
            </form>
          )}
        </div>
      </details>
    </section>
  );
}
