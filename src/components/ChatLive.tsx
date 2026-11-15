"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { checkConversation, markDirectMessagesRead, sendDirectMessage, setTyping } from "@/app/actions/chat";
import { enterSends } from "./ChatMessage";

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

/**
 * Asks every 2.5 seconds whether the other person is typing, and shows three
 * bouncing dots while they are. The same check notices a newer message and
 * refreshes the page, so replies appear within seconds instead of waiting for
 * the slower background refresh.
 */
export function TypingIndicator({ peerId, name, latestId }: { peerId: number; name: string; latestId?: number }) {
  const router = useRouter();
  const [typing, setShown] = useState(false);
  const indicator = useRef<HTMLDivElement>(null);
  const latest = useRef(latestId ?? 0);
  const refreshedFor = useRef(0);
  useEffect(() => { latest.current = latestId ?? 0; }, [latestId]);

  useEffect(() => {
    let stopped = false;
    let wasTyping = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      const pulse = await checkConversation(peerId).catch(() => null);
      if (stopped || !pulse) return;
      setShown(pulse.typing);
      const newest = pulse.latestId ?? 0;
      // Refresh once for each newer message, and when typing stops (a message has usually just been sent).
      if ((newest > latest.current && refreshedFor.current !== newest) || (wasTyping && !pulse.typing)) {
        refreshedFor.current = newest;
        router.refresh();
      }
      wasTyping = pulse.typing;
    }
    const timer = window.setInterval(check, 2500);
    void check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [peerId, router]);

  // Keep the dots in view when the reader is already at the bottom of the conversation.
  useLayoutEffect(() => {
    const region = indicator.current?.closest<HTMLElement>("[role=region]");
    if (typing && region && region.scrollHeight - region.scrollTop - region.clientHeight < 140) {
      region.scrollTop = region.scrollHeight;
    }
  }, [typing]);

  return (
    <div ref={indicator} role="status" aria-live="polite" className="min-h-0">
      {typing && (
        <div className="mt-4 flex [animation:rise_0.2s_ease-out_both] motion-reduce:animate-none">
          <span className="sr-only">{name} is typing</span>
          <span aria-hidden="true" className="flex h-8 items-center gap-1 bg-field px-3">
            {[0, 160, 320].map((delay) => (
              <span
                key={delay}
                style={{ animationDelay: `${delay}ms` }}
                className="h-1.5 w-1.5 rounded-full bg-ink-soft [animation:typing-dot_1.2s_ease-in-out_infinite] motion-reduce:[animation:none]"
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

/** Read only from event handlers, never while rendering. */
const timeNow = () => Date.now();

const EMOJI = [
  "😀", "😄", "😁", "😂", "🤣", "😊", "🙂", "😉", "😍", "🥰", "😘", "😋",
  "😎", "🤩", "🥳", "🤗", "🤔", "🤭", "😏", "😌", "😴", "😮", "😢", "😭",
  "😅", "😬", "🙃", "😤", "😡", "🙏", "👏", "🙌", "👍", "👎", "👌", "✌️",
  "🤝", "💪", "👀", "❤️", "🧡", "💛", "💚", "💙", "💜", "🔥", "✨", "🎉",
  "💯", "⭐", "🌸", "🎨", "✍️", "📸", "🎵", "☕",
];

export function ChatComposer({ handle, maxLength }: { handle: string; maxLength: number }) {
  const [draft, setDraft] = useState("");
  const [picking, setPicking] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const lastPing = useRef(0);
  const [state, action, pending] = useActionState(async (previous: { error?: string; sentId?: number }, form: FormData) => {
    const result = await sendDirectMessage(handle, previous, form);
    if (result.sentId) {
      setDraft("");
      lastPing.current = 0; // Sending clears "typing…" on the server.
    }
    return result;
  }, {});

  /** Updates the draft and keeps the other person's "typing…" alive while there's text, renewing at most every 3 seconds. */
  function write(value: string) {
    setDraft(value);
    const now = timeNow();
    if (value.trim()) {
      if (now - lastPing.current < 3000) return;
      lastPing.current = now;
      void setTyping(handle, true).catch(() => {});
    } else if (lastPing.current) {
      lastPing.current = 0;
      void setTyping(handle, false).catch(() => {});
    }
  }

  // Grow with the text, up to the textarea's max height, then scroll.
  useLayoutEffect(() => {
    const input = field.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [draft]);

  useEffect(() => {
    if (!picking) return;
    function outside(event: PointerEvent) {
      if (!picker.current?.contains(event.target as Node)) setPicking(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPicking(false);
        field.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [picking]);

  function insert(emoji: string) {
    const input = field.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = (draft.slice(0, start) + emoji + draft.slice(end)).slice(0, maxLength);
    write(next);
    requestAnimationFrame(() => {
      const caret = Math.min(start + emoji.length, next.length);
      input?.setSelectionRange(caret, caret);
    });
  }

  return (
    <form action={action} className="border-t border-line bg-paper px-4 py-3 md:px-5">
      {state.error && <p role="alert" className="mb-2 text-sm text-heavy">{state.error}</p>}
      <div className="flex items-end gap-2.5">
        <div ref={picker} className="relative shrink-0">
          <button
            type="button"
            aria-label="Add emoji"
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
            className={`grid h-11 w-9 place-items-center text-ink-soft hover:text-ink ${picking ? "text-ink" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" /><path d="M8.8 14.2a4 4 0 0 0 6.4 0" /><path d="M9.3 9.8h.01M14.7 9.8h.01" strokeWidth="2.4" />
            </svg>
          </button>
          {picking && (
            <div role="group" aria-label="Emoji" className="absolute bottom-full left-0 z-40 mb-2 grid w-[min(19.5rem,calc(100vw-2rem))] grid-cols-8 gap-0.5 border border-line bg-paper p-2 shadow-lg">
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insert(emoji)}
                  aria-label={`Insert ${emoji}`}
                  className="grid aspect-square place-items-center text-xl hover:bg-field"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 border-b border-transparent bg-field focus-within:border-ink">
          <textarea
            ref={field}
            name="message"
            aria-label="Message"
            placeholder="Write a message"
            rows={1}
            maxLength={maxLength}
            required
            readOnly={pending}
            value={draft}
            onChange={(event) => write(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && enterSends()) {
                event.preventDefault();
                if (draft.trim() && !pending) event.currentTarget.form?.requestSubmit();
              }
            }}
            className="block max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-6 outline-none placeholder:text-muted md:text-sm"
          />
        </div>
        <button type="submit" disabled={pending || !draft.trim()} className="btn-primary min-h-11 px-6 py-0 disabled:bg-field disabled:text-muted disabled:opacity-100">
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
