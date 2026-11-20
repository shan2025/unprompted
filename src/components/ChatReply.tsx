"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type MessageQuote = { author: string; body: string };
type ReplyTarget = MessageQuote & { id: number };

const ChatReplyContext = createContext<{
  reply: ReplyTarget | null;
  setReply: Dispatch<SetStateAction<ReplyTarget | null>>;
} | null>(null);

export function ChatReplyProvider({ children }: { children: ReactNode }) {
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  return <ChatReplyContext.Provider value={{ reply, setReply }}>{children}</ChatReplyContext.Provider>;
}

export function useChatReply() {
  const context = useContext(ChatReplyContext);
  if (!context) throw new Error("Chat replies require a ChatReplyProvider.");
  return context;
}

export function ChatQuote({ quote, onDark = false, draft = false }: {
  quote: MessageQuote;
  onDark?: boolean;
  draft?: boolean;
}) {
  return (
    <blockquote className={`min-w-0 rounded-[8px] border-s-2 border-[var(--chat-orange)] px-3 py-1.5 text-sm leading-5 ${onDark ? "bg-white/12 text-white" : "bg-field text-ink-soft"}`}>
      <p className="truncate font-semibold">{draft && "Replying to "}{quote.author}</p>
      <p className="line-clamp-2 whitespace-normal [overflow-wrap:anywhere]">{quote.body}</p>
    </blockquote>
  );
}
