"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { checkConversation, markDirectMessagesRead, sendDirectMessage, setTyping } from "@/app/actions/chat";
import { enterSends } from "./ChatMessage";

export function ChatLive({ peerId, readThrough, unreadIds }: {
  peerId?: number;
  readThrough?: number;
  unreadIds: number[];
}) {
  const router = useRouter();
  const unread = unreadIds.join(",");

  useEffect(() => {
    let events: EventSource | undefined;

    function update() {
      if (document.visibilityState === "visible") router.refresh();
    }
    function watch() {
      if (document.visibilityState !== "visible") {
        events?.close();
        events = undefined;
        return;
      }
      if (!events && typeof EventSource !== "undefined") {
        events = new EventSource("/api/chat/events");
        events.addEventListener("change", update);
      }
    }
    function onVisibilityChange() {
      watch();
      update();
    }

    watch();
    const timer = window.setInterval(update, 10_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      events?.close();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  useEffect(() => {
    if (!peerId || (!readThrough && !unread)) return;
    const sender = peerId;
    const ids = unread ? unread.split(",").map(Number) : [];
    let stopped = false;
    let pending = false;
    let retry: number | undefined;

    async function acknowledge() {
      if (stopped || pending || document.visibilityState !== "visible") return;
      window.clearTimeout(retry);
      pending = true;
      try {
        await markDirectMessagesRead(ids, readThrough ? { peerId: sender, messageId: readThrough } : undefined);
      } catch {
        if (!stopped) retry = window.setTimeout(acknowledge, 2000);
      } finally {
        pending = false;
      }
    }
    function onVisibilityChange() {
      void acknowledge();
    }

    void acknowledge();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [peerId, readThrough, unread]);

  return null;
}

export function ChatSearchInput({ label, placeholder, query }: { label: string; placeholder: string; query: string }) {
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return;
      const input = field.current;
      if (!input?.getClientRects().length) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <input
      ref={field}
      type="search"
      name="q"
      aria-label={label}
      aria-keyshortcuts="Control+K Meta+K"
      placeholder={placeholder}
      defaultValue={query}
      maxLength={100}
      className="min-h-11 min-w-0 flex-1 bg-transparent pr-2 text-base outline-none placeholder:text-muted"
    />
  );
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
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[var(--chat-thread-gutter)] py-5 md:py-6"
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
          <span aria-hidden="true" className="flex h-8 items-center gap-1 rounded-[12px] bg-field px-3">
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
    <form action={action} className="border-t border-line bg-paper px-3 py-3 md:px-5 md:py-3.5">
      {state.error && <p role="alert" className="mb-2 text-sm text-heavy">{state.error}</p>}
      <div className="flex items-end gap-2 sm:gap-2.5">
        <div ref={picker} className="relative shrink-0">
          <button
            type="button"
            aria-label="Add emoji"
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
            className={`grid size-11 place-items-center rounded-[14px] bg-field text-ink-soft hover:text-ink md:size-13 xl:size-14 ${picking ? "text-ink" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" /><path d="M8.8 14.2a4 4 0 0 0 6.4 0" /><path d="M9.3 9.8h.01M14.7 9.8h.01" strokeWidth="2.4" />
            </svg>
          </button>
          {picking && (
            <div role="group" aria-label="Emoji" className="absolute bottom-full left-0 z-40 mb-2 grid max-h-[min(20rem,45dvh)] w-[min(21rem,calc(100vw-2rem))] grid-cols-6 gap-0.5 overflow-y-auto rounded-[16px] border border-line bg-paper p-2 shadow-lg">
              {EMOJI.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insert(emoji)}
                  aria-label={`Insert ${emoji}`}
                  className="grid aspect-square min-h-10 place-items-center rounded-[9px] text-xl hover:bg-field"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 rounded-[15px] border border-transparent bg-field focus-within:border-[var(--chat-focus)]">
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
            className="block max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-base leading-6 outline-none placeholder:text-muted md:min-h-[50px] md:px-4 md:py-3 xl:min-h-[54px] xl:py-3.5"
          />
        </div>
        <button type="submit" aria-label={pending ? "Sending message" : "Send message"} disabled={pending || !draft.trim()} className="grid h-11 w-12 shrink-0 place-items-center rounded-[14px] bg-[var(--chat-orange)] text-ink hover:bg-[#f57e12] disabled:cursor-not-allowed disabled:bg-[#ffc38c] disabled:text-[#704420] md:h-13 md:w-15 xl:h-14 xl:w-16">
          <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {pending
              ? <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3" />
              : <path d="m21 3-6.2 18-3.9-7.9L3 9.2 21 3Zm0 0L10.9 13.1" />}
          </svg>
        </button>
      </div>
    </form>
  );
}
