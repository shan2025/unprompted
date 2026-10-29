"use client";

import { useActionState } from "react";
import { addComment } from "@/app/actions/posts";
import { MAX_COMMENT } from "@/lib/post-form";

export function CommentForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(addComment, null);

  return (
    // Changing the key after a successful post remounts the form, clearing it.
    <form key={state?.key ?? 0} action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor="comment" className="sr-only">
        Add a comment
      </label>
      <textarea id="comment" name="body" rows={3} maxLength={MAX_COMMENT} className="field" placeholder="Say something kind and useful." />
      {state?.message && !state.ok && <p className="text-sm font-medium text-heavy">{state.message}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
