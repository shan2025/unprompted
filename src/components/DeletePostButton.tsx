"use client";

import { useState } from "react";
import { deletePost } from "@/app/actions/posts";
import { SubmitButton } from "./SubmitButton";

export function DeletePostButton({ slug }: { slug: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="text-sm font-medium text-muted hover:text-heavy" onClick={() => setConfirming(true)}>
        Delete this post
      </button>
    );
  }
  return (
    <form action={deletePost} className="space-y-3" role="group" aria-label="Confirm deleting this post">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-sm leading-relaxed text-ink-soft">This deletes the post, its image, comments and appreciations for good.</p>
      <div className="flex items-center gap-4">
        <SubmitButton className="text-sm font-semibold text-heavy hover:underline" pendingText="Deleting…">
          Yes, delete it
        </SubmitButton>
        <button type="button" className="text-sm font-medium text-muted hover:text-ink" onClick={() => setConfirming(false)}>
          Keep it
        </button>
      </div>
    </form>
  );
}
