"use client";

import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition, type CSSProperties, type ReactNode, type RefObject } from "react";
import { deleteDirectMessage, editDirectMessage, reactToDirectMessage } from "@/app/actions/chat";
import { MAX_MESSAGE_LENGTH, REACTIONS } from "@/lib/chat-rules";

type Reaction = { emoji: string; mine: boolean };

/** Enter sends on keyboards with a mouse; on phones it adds a new line and the button sends. */
export function enterSends() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
type Panel = "react" | "menu" | "confirm" | null;

export function ChatMessage({ id, body, own, author, time, dateTime, edited, editableUntil, reactions, seen }: {
  id: number;
  body: string;
  own: boolean;
  author: string;
  time: string;
  dateTime: string;
  edited: boolean;
  editableUntil: number;
  reactions: Reaction[];
  seen: boolean;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(false);
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(reactions, (current, emoji: string | null) => [
    ...current.filter((reaction) => !reaction.mine),
    ...(emoji ? [{ emoji, mine: true }] : []),
  ]);
  const reactButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mine = shown.find((reaction) => reaction.mine)?.emoji ?? null;

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const result = await action().catch(() => ({ error: "Something went wrong. Try again." }));
      if (result.error) setError(result.error);
      else after?.();
    });
  }

  function react(emoji: string) {
    const next = emoji === mine ? null : emoji;
    setPanel(null);
    setError("");
    startTransition(async () => {
      setShown(next);
      const result = await reactToDirectMessage(id, next).catch(() => ({ error: "Something went wrong. Try again." }));
      if (result.error) setError(result.error);
    });
  }

  async function copy() {
    setPanel(null);
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy this message.");
    }
  }

  const grouped = Object.entries(shown.reduce<Record<string, number>>((counts, reaction) => {
    counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
    return counts;
  }, {}));

  return (
    <li className={`group flex flex-col ${own ? "items-end" : "items-start"}`}>
      <div className={`flex w-full items-center gap-1 ${own ? "flex-row-reverse" : ""}`}>
        {editing ? (
          <EditBox
            initial={body}
            pending={pending}
            onCancel={() => { setEditing(false); setError(""); }}
            onSave={(text) => text.trim() === body ? setEditing(false) : run(() => editDirectMessage(id, text), () => setEditing(false))}
          />
        ) : (
          <div className={`relative max-w-[78%] sm:max-w-[72%] ${shown.length ? "mb-3" : ""}`}>
            <div className={`rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] ${own ? "rounded-br-sm bg-ink text-paper" : "rounded-bl-sm border border-line bg-paper text-ink"} ${pending ? "opacity-60" : ""}`}>
              <span className="sr-only">{own ? "You" : author}: </span>{body}
            </div>
            {grouped.length > 0 && (
              <button
                type="button"
                onClick={() => (mine ? react(mine) : setPanel("react"))}
                aria-label={`Reactions: ${shown.map((reaction) => `${reaction.emoji}${reaction.mine ? " (yours)" : ""}`).join(", ")}${mine ? ". Remove yours" : ""}`}
                className={`absolute -bottom-3.5 ${own ? "right-2" : "left-2"} flex h-7 items-center gap-0.5 rounded-full border border-line bg-paper px-1.5 text-sm leading-none shadow-sm hover:bg-field`}
              >
                {grouped.map(([emoji, count]) => (
                  <span key={emoji} className="flex items-center">{emoji}{count > 1 && <span className="ml-0.5 text-xs text-ink-soft">{count}</span>}</span>
                ))}
              </button>
            )}
          </div>
        )}
        {!editing && (
          <div className={`flex shrink-0 items-center opacity-100 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 ${panel ? "[@media(hover:hover)]:opacity-100" : ""}`}>
            <ToolButton ref={reactButton} label="React" active={panel === "react"} onClick={() => setPanel(panel === "react" ? null : "react")}>
              <circle cx="12" cy="12" r="8.5" /><path d="M8.8 14.2a4 4 0 0 0 6.4 0" /><path d="M9.3 9.8h.01M14.7 9.8h.01" strokeWidth="2.4" />
            </ToolButton>
            <ToolButton ref={menuButton} label="More options" active={panel === "menu" || panel === "confirm"} onClick={() => {
              setEditable(Date.now() < editableUntil);
              setPanel(panel ? null : "menu");
            }}>
              <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.8" />
            </ToolButton>
          </div>
        )}
      </div>

      {panel === "react" && (
        <Floating anchor={reactButton} alignEnd={own} onClose={() => setPanel(null)}>
          <div role="group" aria-label="Choose a reaction" className="flex gap-0.5 rounded-full border border-line bg-paper p-1 shadow-lg">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                aria-pressed={emoji === mine}
                aria-label={emoji === mine ? `Remove ${emoji}` : `React ${emoji}`}
                className={`grid h-10 w-10 place-items-center rounded-full text-xl transition-transform hover:scale-115 hover:bg-field ${emoji === mine ? "bg-field" : ""}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Floating>
      )}

      {(panel === "menu" || panel === "confirm") && (
        <Floating anchor={menuButton} alignEnd={own} prefer="below" onClose={() => setPanel(null)}>
          <div className="min-w-44 overflow-hidden rounded-xl border border-line bg-paper py-1 text-sm shadow-lg">
            {panel === "confirm" ? (
              <div className="px-3 py-2">
                <p className="mb-2 font-semibold">Unsend for everyone?</p>
                <p className="mb-3 text-ink-soft">It&apos;s removed from both sides of the chat.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setPanel(null); run(() => deleteDirectMessage(id)); }} className="rounded-full bg-heavy px-3 py-1.5 font-semibold text-paper">Unsend</button>
                  <button type="button" onClick={() => setPanel("menu")} className="rounded-full px-3 py-1.5 font-semibold hover:bg-field">Cancel</button>
                </div>
              </div>
            ) : (
              <div role="menu" aria-label="Message options">
                <MenuItem onClick={copy}>Copy text</MenuItem>
                {own && editable && <MenuItem onClick={() => { setPanel(null); setEditing(true); }}>Edit</MenuItem>}
                {own && <MenuItem danger onClick={() => setPanel("confirm")}>Unsend</MenuItem>}
              </div>
            )}
          </div>
        </Floating>
      )}

      <p className={`mt-1 flex gap-1.5 px-1 text-xs text-muted ${shown.length && !editing ? "mt-4" : ""}`}>
        <time dateTime={dateTime}>{time}</time>
        {edited && <span>· Edited</span>}
        {seen && <span>· Seen</span>}
        {copied && <span role="status">· Copied</span>}
      </p>
      {error && <p role="alert" className="mt-1 px-1 text-xs text-heavy">{error}</p>}
    </li>
  );
}

function ToolButton({ ref, label, active, onClick, children }: {
  ref: RefObject<HTMLButtonElement | null>;
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-expanded={active}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-field hover:text-ink ${active ? "bg-field text-ink" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function MenuItem({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={`block w-full px-4 py-2.5 text-left font-medium hover:bg-field ${danger ? "text-heavy" : ""}`}>
      {children}
    </button>
  );
}

/**
 * Pins a small panel next to its button with fixed positioning, so the
 * scrolling message list can't clip it. It closes on outside clicks, Escape,
 * scrolling and resizing.
 */
function Floating({ anchor, alignEnd, prefer = "above", onClose, children }: {
  anchor: RefObject<HTMLElement | null>;
  alignEnd: boolean;
  prefer?: "above" | "below";
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; });

  useLayoutEffect(() => {
    const trigger = anchor.current?.getBoundingClientRect();
    const height = panel.current?.offsetHeight ?? 0;
    if (!trigger) return;
    const gap = 6;
    const above = trigger.top - height - gap;
    const below = trigger.bottom + gap;
    const fitsBelow = below + height <= window.innerHeight - 8;
    const top = prefer === "below" ? (fitsBelow || above < 8 ? below : above) : (above >= 8 ? above : below);
    const vertical = { top: Math.max(8, Math.min(top, window.innerHeight - height - 8)) };
    const horizontal = alignEnd
      ? { right: Math.max(8, window.innerWidth - trigger.right) }
      : { left: Math.max(8, trigger.left) };
    setStyle({ ...vertical, ...horizontal });
    panel.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }, [anchor, alignEnd, prefer]);

  useEffect(() => {
    const trigger = anchor.current;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger?.contains(target)) close.current();
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close.current();
        trigger?.focus();
      }
    }
    function dismiss(event: Event) {
      if (!panel.current?.contains(event.target as Node)) close.current();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [anchor]);

  return <div ref={panel} style={{ position: "fixed", zIndex: 50, ...style }}>{children}</div>;
}

function EditBox({ initial, pending, onSave, onCancel }: {
  initial: string;
  pending: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const input = field.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);

  return (
    <form
      className="w-full max-w-[88%] sm:max-w-[72%]"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) onSave(text);
      }}
    >
      <textarea
        ref={field}
        aria-label="Edit message"
        value={text}
        maxLength={MAX_MESSAGE_LENGTH}
        readOnly={pending}
        rows={Math.min(6, Math.max(2, text.split("\n").length))}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && enterSends()) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="w-full resize-none rounded-xl border border-ink bg-paper px-3 py-2 text-[15px] leading-relaxed outline-none"
      />
      <div className="mt-1.5 flex justify-end gap-2 text-sm">
        <span className="mr-auto hidden self-center text-xs text-muted [@media(hover:hover)_and_(pointer:fine)]:inline">Esc to cancel · Enter to save</span>
        <button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 font-semibold hover:bg-field">Cancel</button>
        <button type="submit" disabled={pending || !text.trim()} className="rounded-full bg-ink px-3.5 py-1.5 font-semibold text-paper disabled:opacity-45">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
