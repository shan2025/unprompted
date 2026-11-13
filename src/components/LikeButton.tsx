"use client";

import { useState, useTransition } from "react";
import { toggleAppreciation } from "@/app/actions/posts";
import { HeartIcon } from "./PostCard";

/**
 * Appreciate a post without leaving the feed. The heart fills at once; the
 * feed page isn't re-fetched, so the button keeps its own state afterwards.
 * Signed-out people are sent to log in by the action.
 */
export function LikeButton({ slug, liked, count, className = "" }: { slug: string; liked: boolean; count: number; className?: string }) {
  const [state, setState] = useState({ liked, count });
  const [pending, startTransition] = useTransition();

  function toggle() {
    const before = state;
    setState({ liked: !before.liked, count: before.count + (before.liked ? -1 : 1) });
    startTransition(async () => {
      try {
        await toggleAppreciation(slug);
      } catch (e) {
        // A login redirect surfaces as a thrown navigation; let it through. Anything else undoes the tap.
        if (String((e as { digest?: unknown })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw e;
        setState(before);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={state.liked}
      aria-label={`Appreciate · ${state.count}`}
      className={`${className} ${state.liked ? "text-heavy" : ""}`}
    >
      <HeartIcon className="h-[26px] w-[26px]" filled={state.liked} />
    </button>
  );
}
