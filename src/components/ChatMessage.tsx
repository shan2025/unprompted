"use client";

import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition, type CSSProperties, type MouseEventHandler, type ReactNode, type RefObject } from "react";
import { deleteDirectMessage, editDirectMessage, reactToDirectMessage } from "@/app/actions/chat";
import { MAX_MESSAGE_LENGTH, REACTIONS } from "@/lib/chat-rules";
import { Avatar } from "./Avatar";
import { ChatQuote, useChatReply, type MessageQuote } from "./ChatReply";
import { ChatTime, clock, fullDay, sameDay, useIsClient } from "./ChatTime";

type Reaction = { emoji: string; mine: boolean };
type Panel = "react" | "menu" | "confirm" | null;

export type ThreadMessage = {
  id: number;
  body: string;
  own: boolean;
  createdAt: string;
  edited: boolean;
  editableUntil: number;
  quote?: MessageQuote;
  reactions: Reaction[];
  receipt?: "read" | "seen";
};

/** Enter sends on keyboards with a mouse; on phones it adds a new line and the button sends. */
export function enterSends() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Messages from one person sent this close together sit in one group, with the time shown once under it. */
const GROUP_GAP_MS = 10 * 60 * 1000;

function together(a: ThreadMessage | undefined, b: ThreadMessage | undefined, client: boolean) {
  if (!a || !b || a.own !== b.own) return false;
  const first = new Date(a.createdAt);
  const second = new Date(b.createdAt);
  return sameDay(first, second, client) && Math.abs(second.getTime() - first.getTime()) < GROUP_GAP_MS;
}

/** The messages of one conversation, with a divider wherever the day changes in the viewer's timezone. */
export function ChatThread({ messages, author, avatarFile }: { messages: ThreadMessage[]; author: string; avatarFile: string | null }) {
  const client = useIsClient();
  return (
    <ol>
      {messages.map((message, index) => {
        const date = new Date(message.createdAt);
        const previous = messages[index - 1];
        const newDay = previous && !sameDay(new Date(previous.createdAt), date, client);
        return (
          <MessageWithDivider key={message.id} divider={newDay ? fullDay(date, client) : null}>
            <ChatMessage
              {...message}
              author={author}
              avatarFile={avatarFile}
              groupStart={!together(previous, message, client)}
              groupEnd={!together(message, messages[index + 1], client)}
            />
          </MessageWithDivider>
        );
      })}
    </ol>
  );
}

function MessageWithDivider({ divider, children }: { divider: string | null; children: ReactNode }) {
  return (
    <>
      {divider && (
        <li aria-hidden="true" className="flex justify-center pt-6">
          <span className="rounded-full bg-field px-4 py-1.5 text-xs leading-5 font-semibold tracking-[0.08em] uppercase text-ink md:text-sm">{divider}</span>
        </li>
      )}
      {children}
    </>
  );
}

function ChatMessage({ id, body, own, author, avatarFile, createdAt, edited, editableUntil, quote, reactions, receipt, groupStart, groupEnd }: ThreadMessage & {
  author: string;
  avatarFile: string | null;
  groupStart: boolean;
  groupEnd: boolean;
}) {
  const client = useIsClient();
  const { setReply } = useChatReply();
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
  const reactionAnchor = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mine = shown.find((reaction) => reaction.mine)?.emoji ?? null;
  const date = new Date(createdAt);

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
    if (panel === "react") reactionAnchor.current?.focus({ preventScroll: true });
    setPanel(null);
    setError("");
    startTransition(async () => {
      setShown(next);
      const result = await reactToDirectMessage(id, next).catch(() => ({ error: "Something went wrong. Try again." }));
      if (result.error) setError(result.error);
    });
  }

  function openReactions(trigger: HTMLButtonElement | null) {
    const sameTrigger = reactionAnchor.current === trigger;
    reactionAnchor.current = trigger;
    setPanel(panel === "react" && sameTrigger ? null : "react");
  }

  function replyToMessage() {
    setPanel(null);
    setReply({ id, body, author: own ? "You" : author });
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
  const meta = groupEnd || edited || copied;

  return (
    <li className={`group relative flex min-w-0 flex-col ${own ? "items-end" : "items-start pl-10 sm:pl-14"} ${groupStart ? "mt-4 first:mt-0 md:mt-5" : "mt-0.5"}`}>
      {!own && groupStart && (
        <Avatar name={author} file={avatarFile} className="absolute top-0.5 left-0 size-8 text-sm sm:size-10" />
      )}
      <div className={`flex w-full items-center gap-1 ${own ? "flex-row-reverse" : ""}`}>
        {editing ? (
          <EditBox
            initial={body}
            pending={pending}
            onCancel={() => { setEditing(false); setError(""); }}
            onSave={(text) => text.trim() === body ? setEditing(false) : run(() => editDirectMessage(id, text), () => setEditing(false))}
          />
        ) : (
          <div className="min-w-0 max-w-[88%] md:max-w-[min(75%,66ch)]">
            <div
              title={client ? `${fullDay(date, true)}, ${clock(date, true)}` : undefined}
              className={`rounded-[14px] px-3.5 py-2.5 text-base leading-normal whitespace-pre-wrap [overflow-wrap:anywhere] md:px-[18px] ${own ? "bg-ink text-white" : "bg-field text-ink"} ${pending ? "opacity-60" : ""}`}
            >
              {quote && <div className="mb-2"><ChatQuote quote={quote} onDark={own} /></div>}
              <span className="sr-only">{own ? "You" : author}: </span>{body}
            </div>
          </div>
        )}
        {!editing && (
          <div className={`flex shrink-0 items-center transition-opacity focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 ${panel ? "" : "[@media(hover:hover)_and_(pointer:fine)]:opacity-0"}`}>
            <ToolButton label="Reply" pointerOnly onClick={replyToMessage}>
              <path d="m9 10-5 5 5 5m-5-5h10a5 5 0 0 0 0-10h-2" />
            </ToolButton>
            <ToolButton label="React" pointerOnly active={panel === "react"} onClick={(event) => openReactions(event.currentTarget)}>
              <circle cx="12" cy="12" r="8.5" /><path d="M8.8 14.2a4 4 0 0 0 6.4 0" /><path d="M9.3 9.8h.01M14.7 9.8h.01" strokeWidth="2.4" />
            </ToolButton>
            <ToolButton ref={menuButton} label="More options" active={panel === "menu" || panel === "confirm"} onClick={() => {
              setEditable(Date.now() < editableUntil);
              setPanel(panel === "menu" || panel === "confirm" ? null : "menu");
            }}>
              <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="2.8" />
            </ToolButton>
          </div>
        )}
      </div>

      {grouped.length > 0 && !editing && (
        <button
          type="button"
          onClick={(event) => (mine ? react(mine) : openReactions(event.currentTarget))}
          aria-label={`Reactions: ${shown.map((reaction) => `${reaction.emoji}${reaction.mine ? " (yours)" : ""}`).join(", ")}${mine ? ". Remove yours" : ""}`}
          className={`-mt-1 ${own ? "mr-1.5" : "ml-1.5"} relative flex h-6 items-center gap-0.5 rounded-full border border-line bg-paper px-1.5 text-xs leading-none hover:bg-field`}
        >
          {grouped.map(([emoji, count]) => (
            <span key={emoji} className="flex items-center">{emoji}{count > 1 && <span className="ml-0.5 text-[11px] text-ink-soft">{count}</span>}</span>
          ))}
        </button>
      )}

      {panel === "react" && (
        <Floating anchor={reactionAnchor} alignEnd={own} onClose={() => setPanel(null)}>
          <div role="group" aria-label="Choose a reaction" className="grid grid-cols-4 gap-0.5 rounded-[12px] border border-line bg-paper p-1 shadow-lg sm:grid-cols-8">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                aria-pressed={emoji === mine}
                aria-label={emoji === mine ? `Remove ${emoji}` : `React ${emoji}`}
                className={`grid size-11 place-items-center rounded-[8px] text-xl hover:bg-field ${emoji === mine ? "bg-[var(--chat-tab)]" : ""}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Floating>
      )}

      {(panel === "menu" || panel === "confirm") && (
        <Floating key={panel} anchor={menuButton} alignEnd={own} prefer="below" onClose={() => setPanel(null)}>
          <div className="min-w-48 overflow-hidden rounded-[12px] border border-line bg-paper py-1 text-sm shadow-lg">
            {panel === "confirm" ? (
              <div className="px-4 py-3">
                <p className="mb-1 font-semibold">Unsend for everyone?</p>
                <p className="mb-3 text-muted">It&apos;s removed from both sides of the chat.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setPanel(null); run(() => deleteDirectMessage(id)); }} className="btn bg-heavy px-3.5 py-2 text-[11px] text-white">Unsend</button>
                  <button type="button" onClick={() => setPanel("menu")} className="btn-ghost px-3.5 py-2 text-[11px]">Cancel</button>
                </div>
              </div>
            ) : (
              <div role="menu" aria-label="Message options">
                <MenuItem onClick={replyToMessage}>Reply</MenuItem>
                <MenuItem onClick={() => openReactions(menuButton.current)}>React</MenuItem>
                <MenuItem onClick={copy}>Copy text</MenuItem>
                {own && editable && <MenuItem onClick={() => { setPanel(null); setEditing(true); }}>Edit</MenuItem>}
                {own && <MenuItem danger onClick={() => setPanel("confirm")}>Unsend</MenuItem>}
              </div>
            )}
          </div>
        </Floating>
      )}

      {meta && (
        <p className="mt-1.5 flex items-center gap-1.5 px-0.5 text-xs leading-5 font-medium text-[var(--chat-time)] tabular-nums md:text-[15px]">
          {groupEnd && <ChatTime iso={createdAt} style="thread" />}
          {edited && <span>{groupEnd ? "· " : ""}Edited</span>}
          {receipt === "seen" && <span className="text-[var(--chat-seen)]">· Seen</span>}
          {receipt === "read" && groupEnd && (
            <span className="text-[var(--chat-receipt)]">
              <span className="sr-only">Read</span>
              <svg viewBox="0 0 24 24" className="size-[18px] md:size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3 12 4 4 9-9m-5 8 2 2L22 8" />
              </svg>
            </span>
          )}
          {copied && <span role="status">· Copied</span>}
        </p>
      )}
      {error && <p role="alert" className="mt-1 px-0.5 text-xs text-heavy">{error}</p>}
    </li>
  );
}

function ToolButton({ ref, label, active, pointerOnly = false, onClick, children }: {
  ref?: RefObject<HTMLButtonElement | null>;
  label: string;
  active?: boolean;
  pointerOnly?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-expanded={active}
      onClick={onClick}
      title={label}
      className={`size-11 place-items-center rounded-full text-muted hover:bg-field hover:text-ink [@media(hover:hover)_and_(pointer:fine)]:size-9 ${pointerOnly ? "hidden [@media(hover:hover)_and_(pointer:fine)]:grid" : "grid"} ${active ? "bg-field text-ink" : ""}`}
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
    const width = panel.current?.offsetWidth ?? 0;
    if (!trigger) return;
    const gap = 6;
    const above = trigger.top - height - gap;
    const below = trigger.bottom + gap;
    const fitsBelow = below + height <= window.innerHeight - 8;
    const top = prefer === "below" ? (fitsBelow || above < 8 ? below : above) : (above >= 8 ? above : below);
    const left = alignEnd ? trigger.right - width : trigger.left;
    setStyle({
      top: Math.max(8, Math.min(top, window.innerHeight - height - 8)),
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
    });
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

  return <div ref={panel} className="fixed z-[70] w-max max-w-[calc(100vw-1rem)]" style={style}>{children}</div>;
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
      className="w-full max-w-[88%] md:max-w-[70%]"
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
        className="w-full resize-none rounded-[12px] border border-ink bg-paper px-3 py-2 text-base leading-relaxed outline-none focus-visible:border-[var(--chat-focus)]"
      />
      <div className="mt-1.5 flex justify-end gap-2">
        <span className="mr-auto hidden self-center text-xs text-muted [@media(hover:hover)_and_(pointer:fine)]:inline">Esc to cancel · Enter to save</span>
        <button type="button" onClick={onCancel} className="btn-ghost px-3.5 py-2 text-[11px]">Cancel</button>
        <button type="submit" disabled={pending || !text.trim()} className="btn-primary px-3.5 py-2 text-[11px]">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
