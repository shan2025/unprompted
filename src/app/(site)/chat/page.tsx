import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ChatIcon } from "@/components/ChatIcon";
import { ChatComposer, ChatHistory, ChatLive, TypingIndicator } from "@/components/ChatLive";
import { ChatThread } from "@/components/ChatMessage";
import { ChatTime } from "@/components/ChatTime";
import { Mark } from "@/components/Logo";
import { ConfirmEmailCard } from "@/components/VerifyEmailNotice";
import { requireUser } from "@/lib/auth";
import { findChatMember, getMessageHistory, listConversations, MAX_MESSAGE_LENGTH, searchChatMembers } from "@/lib/chat";
import { EDIT_WINDOW_MS } from "@/lib/chat-rules";
import { followPage, followPageSize } from "@/lib/journal";

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
    <div className="mx-auto max-w-6xl md:px-6 md:py-8">
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
    <div className="grid h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-80 bg-paper md:h-[clamp(480px,calc(100dvh-140px),900px)] md:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] md:border md:border-line">
      <ChatLive peerId={selected?.id} readThrough={readThrough} unreadIds={unreadIds} />

      <section className={`${hasDetail ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col md:border-r md:border-line`}>
        {compose ? (
          <PeoplePane query={query} scope={scope} page={page} people={people} location={location} selectedId={selected?.id} hasSearch={hasSearch} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 px-4 pb-4 pt-5 md:px-5">
              <h1 className="text-[28px] font-bold tracking-tight">Chat</h1>
              <Link href={href({ new: "1" })} className="btn-primary gap-2 px-4 py-2.5 text-[11px]">
                <ChatIcon className="h-4 w-4" /> New message
              </Link>
            </div>
            <div className="px-4 md:px-5">
              <SearchBox label="Search conversations" placeholder="Search conversations" query={query} hidden={{ filter: location.filter }} />
            </div>
            <Tabs label="Filter conversations">
              <Tab href={href({ q: query })} current={!unreadOnly}>All</Tab>
              <Tab href={href({ q: query, filter: "unread" })} current={unreadOnly}>Unread</Tab>
            </Tabs>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
        {hasDetail && <h1 className="sr-only">Chat</h1>}
        {selected && history ? (
          <>
            <div className="flex min-h-16 items-center gap-3 border-b border-line px-4 py-3 md:px-5">
              <Back href={listHref} label={compose ? "Back to people" : "Back to inbox"} className="md:hidden" />
              <Link href={`/u/${selected.handle}`} aria-label={`View ${selected.name}'s profile`} className="group flex min-w-0 items-center gap-3">
                <Avatar name={selected.name} file={selected.avatarFile} className="h-10 w-10 shrink-0 text-sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold group-hover:underline">{selected.name}</span>
                  <span className="block truncate text-xs text-muted">@{selected.handle}</span>
                </span>
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
                    messages={history.messages.map((message) => ({
                      id: message.id,
                      body: message.body,
                      own: message.senderId === user.id,
                      createdAt: message.createdAt.toISOString(),
                      edited: Boolean(message.editedAt),
                      editableUntil: message.createdAt.getTime() + EDIT_WINDOW_MS,
                      reactions: message.reactions.map((reaction) => ({ emoji: reaction.emoji, mine: reaction.userId === user.id })),
                      seen: message === latest && message.senderId === user.id && Boolean(message.readAt),
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
      <div className="flex items-center gap-1.5 px-4 pb-4 pt-5 md:px-5">
        <Back href="/chat" label="Back to inbox" />
        <h1 className="text-2xl font-bold tracking-tight">New message</h1>
      </div>
      <div className="px-4 md:px-5">
        <SearchBox label="Search members" placeholder="Name or @handle" query={query} hidden={{ new: "1", people: scopeParam(scope) }} underline />
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
          <ul>
            {people.slice(0, followPageSize).map((person) => (
              <li key={person.id} className="border-b border-line">
                <Link
                  href={href({ ...location, with: person.handle })}
                  prefetch={false}
                  aria-current={person.id === selectedId ? "page" : undefined}
                  className={`flex items-center gap-3 px-4 py-3 md:px-5 ${person.id === selectedId ? "bg-field" : "hover:bg-field/60"}`}
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

function SearchBox({ label, placeholder, query, hidden = {}, underline = false }: {
  label: string;
  placeholder: string;
  query: string;
  hidden?: Record<string, string | undefined>;
  underline?: boolean;
}) {
  return (
    <form action="/chat" method="get" role="search" className={`flex items-center gap-2 border-b bg-field pl-3 focus-within:border-ink ${underline ? "border-ink/60" : "border-transparent"}`}>
      {Object.entries(hidden).map(([name, value]) => value && <input key={name} type="hidden" name={name} value={value} />)}
      <input
        key={query}
        type="search"
        name="q"
        aria-label={label}
        placeholder={placeholder}
        defaultValue={query}
        maxLength={100}
        className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-muted md:text-sm"
      />
      <button type="submit" aria-label={label} className="grid h-10 w-10 shrink-0 place-items-center text-ink-soft hover:text-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
        </svg>
      </button>
    </form>
  );
}

function Tabs({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="mt-3 flex gap-5 border-b border-line px-4 text-[13px] md:px-5">
      {children}
    </nav>
  );
}

function Tab({ href: url, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={url}
      aria-current={current ? "page" : undefined}
      className={`-mb-px border-b-2 pb-2.5 pt-1 ${current ? "border-ink font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
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
    <li className="border-b border-line">
      <Link href={url} prefetch={false} aria-current={selected ? "page" : undefined} className={`flex items-center gap-3 px-4 py-3.5 md:px-5 ${selected ? "bg-field" : "hover:bg-field/60"}`}>
        <Avatar name={person.name} file={person.avatarFile} className="h-10 w-10 shrink-0 text-sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
              <span className={`truncate text-sm ${unread ? "font-bold" : "font-semibold"}`}>{person.name}</span>
              <span className="min-w-0 shrink-[3] truncate text-xs text-muted">@{person.handle}</span>
            </span>
            <ChatTime iso={time} className={`shrink-0 text-xs ${unread ? "font-semibold text-ink" : "text-muted"}`} />
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-[13px] ${unread ? "font-medium text-ink" : "text-ink-soft"}`}>{preview}</span>
            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-heavy"><span className="sr-only">Unread</span></span>}
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
    <Link href={url} aria-label={label} className={`-ml-2 grid h-10 w-9 shrink-0 place-items-center hover:bg-field ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m14 6-6 6 6 6" />
      </svg>
    </Link>
  );
}
