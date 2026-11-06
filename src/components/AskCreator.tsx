"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { askCreator } from "@/app/actions/inquiries";
import { MAX_QUESTION } from "@/lib/inquiry";
import { keepFields } from "./keepFields";

/** `loginHref` is set when nobody is logged in, and replaces the form with a link. */
export function AskCreator({
  target,
  slug,
  creatorName,
  loginHref,
}: {
  target: "listing" | "post";
  slug: string;
  creatorName: string;
  loginHref?: string;
}) {
  const [state, action, pending] = useActionState(askCreator, null);
  const id = useId();
  const firstName = creatorName.split(" ")[0];
  const heading = target === "post" ? "Love this work?" : "Got a question?";

  return (
    <div className="card p-5">
      <span className="eyebrow">Ask the creator</span>
      <p className="mt-2 font-display text-xl font-medium">{heading}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {target === "post"
          ? `Ask ${firstName} whether they'd sell it, or take on something similar.`
          : `Ask ${firstName} about this work before you buy.`}
      </p>
      {loginHref ? (
        <Link href={loginHref} className="btn-ghost mt-4 block text-center">
          Log in to ask
        </Link>
      ) : state?.ok ? (
        <p role="status" className="mt-4 rounded-lg bg-paper px-4 py-3 text-sm text-ink-soft">
          <strong className="text-ink">Sent.</strong> {firstName} can reply to your email address.
        </p>
      ) : (
        <form action={action} onSubmit={keepFields(action)} className="mt-4 space-y-3">
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="slug" value={slug} />
          <label htmlFor={id} className="sr-only">
            Your question for {creatorName}
          </label>
          <textarea
            id={id}
            name="message"
            rows={3}
            maxLength={MAX_QUESTION}
            required
            className="field"
            placeholder={target === "post" ? "Would you sell this? What would it cost?" : "What would you like to know?"}
          />
          {state?.message && (
            <p role="alert" className="text-sm font-medium text-heavy">
              {state.message}
            </p>
          )}
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Sending…" : "Send question"}
          </button>
          <p className="text-xs leading-relaxed text-muted">{firstName} will see your name and email address, so they can reply to you directly.</p>
        </form>
      )}
    </div>
  );
}
