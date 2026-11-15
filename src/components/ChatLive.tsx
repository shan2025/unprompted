"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { markDirectMessagesRead, sendDirectMessage } from "@/app/actions/chat";

export function ChatLive({ unreadIds }: { unreadIds: number[] }) {
  const router = useRouter();
  const unread = unreadIds.join(",");

  useEffect(() => {
    function update() {
      if (document.visibilityState === "visible") router.refresh();
    }
    const timer = window.setInterval(update, 10_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [router]);

  useEffect(() => {
    if (unread && document.visibilityState === "visible") {
      void markDirectMessagesRead(unread.split(",").map(Number)).catch(() => {
        // The next refresh can retry an interrupted read update.
      });
    }
  }, [unread]);

  return null;
}

export function ChatHistory({ children, latestId, ownLatest, older }: {
  children: ReactNode;
  latestId?: number;
  ownLatest: boolean;
  older: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  const previous = useRef<number | undefined>(undefined);
  const nearBottom = useRef(true);

  useEffect(() => {
    const region = list.current;
    if (region && !older && (previous.current === undefined || (previous.current !== latestId && (nearBottom.current || ownLatest)))) {
      region.scrollTop = region.scrollHeight;
    }
    previous.current = latestId;
  }, [latestId, older, ownLatest]);

  return (
    <div
      ref={list}
      tabIndex={0}
      role="region"
      aria-label="Message history"
      onScroll={(event) => {
        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        nearBottom.current = scrollHeight - scrollTop - clientHeight < 100;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
    >
      {children}
    </div>
  );
}

export function ChatComposer({ handle, maxLength }: { handle: string; maxLength: number }) {
  const [draft, setDraft] = useState("");
  const [state, action, pending] = useActionState(async (previous: { error?: string; sentId?: number }, form: FormData) => {
    const result = await sendDirectMessage(handle, previous, form);
    if (result.sentId) setDraft("");
    return result;
  }, {});

  return (
    <form action={action} className="border-t border-line bg-paper px-4 py-3 sm:px-6">
      {state.error && <p role="alert" className="mb-2 text-sm text-heavy">{state.error}</p>}
      <div className="flex items-end gap-2">
        <textarea
          name="message"
          aria-label="Message"
          placeholder="Write a message"
          rows={2}
          maxLength={maxLength}
          required
          readOnly={pending}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-field px-3 py-2 text-base leading-snug focus-visible:outline-2 focus-visible:outline-ink"
        />
        <button type="submit" disabled={pending || !draft.trim()} className="btn-primary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-45">
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
