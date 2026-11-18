import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ChatComposer, ChatHistory, ChatLive, ChatSearchInput, TypingIndicator } from "@/components/ChatLive";
import { ChatThread } from "@/components/ChatMessage";
import { ChatTime } from "@/components/ChatTime";
import { Mark } from "@/components/Logo";
import { ConfirmEmailCard } from "@/components/VerifyEmailNotice";
import { requireUser } from "@/lib/auth";
import { findChatMember, getMessageHistory, listConversations, MAX_MESSAGE_LENGTH, searchChatMembers } from "@/lib/chat";
import { EDIT_WINDOW_MS } from "@/lib/chat-rules";
import { followPage, followPageSize } from "@/lib/journal";
import "./chat.css";

export const metadata: Metadata = { title: "Chat", robots: { index: false, follow: false } };

type Query = Record<string, string | string[] | undefined>;
type ChatLocation = { with?: string; new?: string; q?: string; filter?: string; before?: string; people?: string; page?: string };
type Member = NonNullable<Awaited<ReturnType<typeof findChatMember>>>;
type Scope = "followers" | "following" | "all";

function href(location: ChatLocation = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(location)) {
    if (value) params.set(key, value);
  }
  return params.size ? `/chat?${params}` : "/chat";
}

function param(value: Query[string], max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Followers is the picker's default tab, so it stays out of the URL. */
function scopeParam(scope: Scope) {
  return scope === "followers" ? undefined : scope;
}

export default function ChatPage({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <div className="chat-page">
      <Suspense fallback={<h1 className="px-4 py-5 text-[28px] font-bold tracking-tight">Chat</h1>}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Inbox({ searchParams }: { searchParams: Promise<Query> }) {
  const params = await searchParams;
  const rawHandle = param(params.with, 31).toLowerCase();
  const handle = /^[a-z0-9_]{3,30}$/.test(rawHandle) ? rawHandle : "";
  const compose = param(params.new, 1) === "1";
  const query = param(params.q, 100);
  const hasSearch = Boolean(query.replace(/^@/, "").trim());
  const scope: Scope = params.people === "following" || params.people === "all" ? params.people : "followers";
  const page = compose ? followPage(params.page) : 1;
  const unreadOnly = !compose && params.filter === "unread";
  const location: ChatLocation = {
    new: compose ? "1" : undefined,
    q: query,
    filter: unreadOnly ? "unread" : undefined,
    people: compose ? scopeParam(scope) : undefined,
    page: page > 1 ? String(page) : undefined,
  };
  const rawBefore = param(params.before, 11);
  const before = /^\d{1,10}$/.test(rawBefore) && Number(rawBefore) <= 2147483647 ? Number(rawBefore) : undefined;
  const user = await requireUser(href({ ...location, with: handle, before: before?.toString() }));

  if (!user.verified) {
    return (
      <div className="px-4 py-8">
        <h1 className="mb-6 text-[28px] font-bold tracking-tight">Chat</h1>
        <ConfirmEmailCard email={user.email ?? ""} doing="send messages" />
      </div>
    );
  }

  const [conversations, people, selected] = await Promise.all([
    compose ? [] : listConversations(user.id, query, unreadOnly, handle ? undefined : before),
    compose ? searchChatMembers(user.id, query, scope === "all" ? undefined : scope, page) : [],
    handle ? findChatMember(user.id, handle) : null,
  ]);
  const history = selected ? await getMessageHistory(user.id, selected.id, before) : null;
  const unreadIds = history?.messages.filter((message) => message.senderId !== user.id && !message.readAt).map((message) => message.id) ?? [];
  const olderConversations = conversations.length > 40 ? conversations[39].messageId : undefined;
  const latest = history?.messages.at(-1);
  const readThrough = !before && (unreadIds.length || history?.older) ? latest?.id : undefined;
  const hasDetail = Boolean(rawHandle);
  const isNew = Boolean(history && !history.messages.length && !before);
  const listHref = href(location);

  return (
    <div className="chat-workspace grid min-h-80">
      <ChatLive peerId={selected?.id} readThrough={readThrough} unreadIds={unreadIds} />

      <section aria-label={compose ? "Find people" : "Inbox"} className={`chat-inbox ${hasDetail ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col md:border-r md:border-line`}>
        {compose ? (
          <PeoplePane query={query} scope={scope} page={page} people={people} location={location} selectedId={selected?.id} hasSearch={hasSearch} />
        ) : (
          <>
            <div className="chat-inbox-heading flex items-center justify-between gap-2">
              <h1 className="text-[28px] leading-tight font-bold tracking-tight">Chat</h1>
              <Link href={href({ new: "1" })} className="chat-new-message inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[12px] bg-ink px-3.5 text-sm font-bold text-white active:opacity-80 xl:min-h-12 xl:px-6">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m14 6 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.9 15Z" />
                </svg>
                New Message
              </Link>
            </div>
            <div className="chat-inbox-gutter">
              <SearchBox label="Search conversations" placeholder="Search conversations" query={query} hidden={{ filter: location.filter }} />
            </div>
            <Tabs label="Filter conversations">
              <Tab href={href({ q: query })} current={!unreadOnly}>All</Tab>
              <Tab href={href({ q: query, filter: "unread" })} current={unreadOnly}>Unread</Tab>
            </Tabs>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
              {conversations.length ? (
                <ul>
                  {conversations.slice(0, 40).map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      person={conversation}
                      url={href({ ...location, with: conversation.handle })}
                      selected={conversation.id === selected?.id}
                      preview={`${conversation.senderId === user.id ? "You: " : ""}${conversation.body}`}
                      time={conversation.createdAt.toISOString()}
                      unread={conversation.unread}
                    />
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center md:px-5">
                  <p className="font-semibold">{query ? "No matching conversations" : unreadOnly ? "You're all caught up" : "No conversations yet"}</p>
                  <p className="mt-1 text-sm text-muted">{query ? "Try a different name or word." : unreadOnly ? "No unread messages." : "Start one with New message."}</p>
                </div>
              )}
              {(before && !hasDetail) || olderConversations ? (
                <div className="flex gap-4 px-4 py-3 text-sm md:px-5">
                  {before && !hasDetail && <Link href={listHref} className="link">Newest</Link>}
                  {olderConversations && <Link href={href({ ...location, before: String(olderConversations) })} className="link">Older conversations</Link>}
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <section aria-label="Conversation" className={`${hasDetail ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
        {hasDetail && <h1 className="sr-only md:hidden">Chat</h1>}
        {selected && history ? (
          <>
            <div className="chat-thread-heading flex items-center gap-2 border-b border-line">
              <Back href={listHref} label={compose ? "Back to people" : "Back to inbox"} className="md:hidden" />
              <Link href={`/u/${selected.handle}`} aria-label={`View ${selected.name}'s profile`} className="group flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                <Avatar name={selected.name} file={selected.avatarFile} className="size-10 shrink-0 text-base md:size-12 xl:size-[52px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg leading-tight font-bold group-hover:underline md:text-[22px]">{selected.name}</span>
                  <span className="mt-0.5 block truncate text-sm text-ink-soft">@{selected.handle}</span>
                </span>
                <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ink-soft group-hover:text-ink md:mr-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" />
                </svg>
              </Link>
            </div>
            {isNew ? (
              <div className="flex min-h-0 flex-1 flex-col px-4 py-5 md:px-6">
                <div className="grid flex-1 place-content-center justify-items-center gap-1 px-2 text-center">
                  <Link href={`/u/${selected.handle}`} aria-label={`View ${selected.name}'s profile`} className="mb-3">
                    <Avatar name={selected.name} file={selected.avatarFile} className="h-16 w-16 text-2xl" />
                  </Link>
                  <h2 className="text-lg font-semibold">Say hello to {selected.name}.</h2>
                  <p className="text-sm text-muted">This is the start of your conversation.</p>
                </div>
                <TypingIndicator key={selected.id} peerId={selected.id} name={selected.name} />
              </div>
            ) : (
              <ChatHistory key={`${selected.id}:${before ?? ""}`} latestId={latest?.id} ownLatest={latest?.senderId === user.id} older={Boolean(before)}>
                {(history.older || before) && (
                  <div className="mb-4 flex justify-center gap-4 text-sm">
                    {history.older && <Link href={href({ ...location, with: handle, before: String(history.older) })} className="link">Older messages</Link>}
                    {before && <Link href={href({ ...location, with: handle })} className="link">Latest messages</Link>}
                  </div>
                )}
                {history.messages.length ? (
                  <ChatThread
                    author={selected.name}
                    avatarFile={selected.avatarFile}
                    messages={history.messages.map((message) => ({
                      id: message.id,
                      body: message.body,
                      own: message.senderId === user.id,
                      createdAt: message.createdAt.toISOString(),
                      edited: Boolean(message.editedAt),
                      editableUntil: message.createdAt.getTime() + EDIT_WINDOW_MS,
                      reactions: message.reactions.map((reaction) => ({ emoji: reaction.emoji, mine: reaction.userId === user.id })),
                      receipt: message.senderId === user.id && message.readAt ? (message === latest ? "seen" : "read") : undefined,
                    }))}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-muted">No earlier messages.</p>
                )}
                {!before && <TypingIndicator key={selected.id} peerId={selected.id} name={selected.name} latestId={latest?.id} />}
              </ChatHistory>
            )}
            {!before && <ChatComposer key={selected.id} handle={selected.handle} maxLength={MAX_MESSAGE_LENGTH} />}
          </>
        ) : hasDetail ? (
          <>
            <div className="flex min-h-16 items-center border-b border-line px-4 md:hidden">
              <Back href={listHref} label={compose ? "Back to people" : "Back to inbox"} />
            </div>
            <EmptyPane title="Member unavailable" text="This person can't be messaged right now.">
              <Link href={listHref} className="link mt-2 text-sm">{compose ? "Back to people" : "Back to inbox"}</Link>
            </EmptyPane>
          </>
        ) : compose ? (
          <EmptyPane title="Who do you want to message?" text="Pick a person from the list to start a conversation." />
        ) : (
          <EmptyPane title="Your conversations" text="Open a conversation or start a new message." />
        )}
      </section>
    </div>
  );
}

function PeoplePane({ query, scope, page, people, location, selectedId, hasSearch }: {
  query: string;
  scope: Scope;
  page: number;
  people: Member[];
  location: ChatLocation;
  selectedId?: number;
  hasSearch: boolean;
}) {
  return (
    <>
      <div className="chat-inbox-heading flex items-center gap-1.5">
        <Back href="/chat" label="Back to inbox" />
        <h1 className="text-2xl font-bold tracking-tight">New message</h1>
      </div>
      <div className="chat-inbox-gutter">
        <SearchBox label="Search members" placeholder="Name or @handle" query={query} hidden={{ new: "1", people: scopeParam(scope) }} />
      </div>
      <Tabs label="Find people by connection">
        {(["followers", "following", "all"] as const).map((value) => (
          <Tab key={value} href={href({ new: "1", people: scopeParam(value), q: query })} current={scope === value}>
            {value === "followers" ? "Followers" : value === "following" ? "Following" : "All members"}
          </Tab>
        ))}
      </Tabs>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {people.length ? (
          <ul className="px-1">
            {people.slice(0, followPageSize).map((person) => (
              <li key={person.id}>
                <Link
                  href={href({ ...location, with: person.handle })}
                  prefetch={false}
                  aria-current={person.id === selectedId ? "page" : undefined}
                  className="chat-conversation-row flex items-center gap-3"
                >
                  <Avatar name={person.name} file={person.avatarFile} className="h-9 w-9 shrink-0 text-sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{person.name}</span>
                    <span className="block truncate text-xs text-muted">@{person.handle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted md:px-5">
            {page > 1 ? "No people on this page." : hasSearch ? "No matching members." : scope === "followers"
              ? "No followers to message yet. Try All members."
              : scope === "following" ? "Nobody you follow can be messaged yet. Try All members."
                : "Find someone by their name or @handle."}
          </p>
        )}
        {(page > 1 || people.length > followPageSize) && (
          <nav aria-label="Member search pages" className="flex gap-4 px-4 py-3 text-sm md:px-5">
            {page > 1 && <Link href={href({ ...location, page: page > 2 ? String(page - 1) : undefined })} className="link">Previous</Link>}
            {people.length > followPageSize && <Link href={href({ ...location, page: String(page + 1) })} className="link">Next</Link>}
          </nav>
        )}
      </div>
    </>
  );
}

function SearchBox({ label, placeholder, query, hidden = {} }: {
  label: string;
  placeholder: string;
  query: string;
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action="/chat" method="get" role="search" className="chat-search flex items-center rounded-[14px] border border-line bg-field focus-within:outline-2 focus-within:outline-[var(--chat-focus)]">
      {Object.entries(hidden).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <button type="submit" aria-label={label} className="grid size-11 shrink-0 place-items-center rounded-[12px] text-ink-soft hover:text-ink">
        <svg viewBox="0 0 24 24" className="size-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
        </svg>
      </button>
      <ChatSearchInput key={query} label={label} placeholder={placeholder} query={query} />
      <kbd aria-hidden="true" className="mr-3 hidden shrink-0 rounded-[5px] border border-line bg-card px-1.5 py-0.5 font-sans text-xs font-semibold text-ink-soft xl:block">Ctrl K</kbd>
    </form>
  );
}

function Tabs({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="chat-inbox-gutter mt-3 mb-2 flex gap-1.5 text-sm md:mt-4 md:mb-3 xl:mb-4">
      {children}
    </nav>
  );
}

function Tab({ href: url, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={url}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full px-3 font-semibold sm:px-4 ${current ? "bg-[var(--chat-tab)] text-ink" : "text-ink-soft hover:bg-field hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}

function ConversationRow({ person, url, selected, preview, time, unread }: {
  person: Member;
  url: string;
  selected: boolean;
  preview: string;
  time: string;
  unread: boolean;
}) {
  return (
    <li>
      <Link href={url} prefetch={false} aria-current={selected ? "page" : undefined} className="chat-conversation-row flex items-center gap-3 md:gap-4">
        <Avatar name={person.name} file={person.avatarFile} className={`size-11 shrink-0 text-base xl:size-[50px] ${selected ? "ring-1 ring-[var(--chat-focus)]" : ""}`} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-base font-bold" title={`@${person.handle}`}>{person.name}</span>
            <ChatTime iso={time} className="shrink-0 text-sm font-medium text-[var(--chat-time)] tabular-nums xl:text-[15px]" />
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-semibold text-ink" : "text-ink-soft"}`}>{preview}</span>
            {unread && <span className="size-2.5 shrink-0 rounded-full bg-[var(--chat-orange)]"><span className="sr-only">Unread</span></span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

function EmptyPane({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-1 px-6 text-center">
      <Mark className="mb-3 h-7 w-7 text-ink-soft" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted">{text}</p>
      {children}
    </div>
  );
}

function Back({ href: url, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <Link href={url} aria-label={label} className={`-ml-2 grid size-11 shrink-0 place-items-center rounded-[10px] hover:bg-field ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m14 6-6 6 6 6" />
      </svg>
    </Link>
  );
}
