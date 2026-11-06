"use client";

import { useState } from "react";
import { removeComment } from "@/app/actions/posts";
import { SubmitButton } from "./SubmitButton";

/** Removing a comment can't be undone, so it takes a second, deliberate click. */
export function DeleteCommentButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="text-base opacity-60 hover:opacity-100" onClick={() => setConfirming(true)}>
        <span role="img" aria-label="Remove comment" title="Remove comment">
          🗑️
        </span>
      </button>
    );
  }
  return (
    <form action={removeComment} className="flex items-center gap-3 text-xs" role="group" aria-label="Confirm removing this comment">
      <input type="hidden" name="id" value={id} />
      <span className="text-ink-soft">Remove this comment?</span>
      <SubmitButton className="font-semibold text-heavy hover:underline" pendingText="Removing…">
        Remove
      </SubmitButton>
      <button type="button" className="font-medium text-muted hover:text-ink" onClick={() => setConfirming(false)}>
        Keep it
      </button>
    </form>
  );
}
