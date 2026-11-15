import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { ChatIcon } from "@/components/ChatIcon";
import { ChatComposer, ChatHistory, ChatLive } from "@/components/ChatLive";
import { ChatMessage } from "@/components/ChatMessage";
import { EDIT_WINDOW_MS } from "@/lib/chat-rules";
import { ConfirmEmailCard } from "@/components/VerifyEmailNotice";
import { requireUser } from "@/lib/auth";
import { findChatMember, getMessageHistory, listConversations, MAX_MESSAGE_LENGTH, searchChatMembers } from "@/lib/chat";
import { formatDate, formatShortDate } from "@/lib/format";
import { followPage, followPageSize } from "@/lib/journal";

export const metadata: Metadata = { title: "Chat", robots: { index: false, follow: false } };

type Query = Record<string, string | string[] | undefined>;
type ChatLocation = { with?: string; new?: string; q?: string; filter?: string; before?: string; people?: string; page?: string };
type Member = NonNullable<Awaited<ReturnType<typeof findChatMember>>>;

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

export default function ChatPage({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <div className="mx-auto max-w-6xl md:px-6 md:py-8">
      <Suspense fallback={<h1 className="px-4 py-5 text-3xl font-semibold">Chat</h1>}>
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
  const direction = params.people === "followers" || params.people === "following" ? params.people : undefined;
  const peopleScope = direction ?? "all";
  const page = compose ? followPage(params.page) : 1;
  const unreadOnly = params.filter === "unread";
  const location = {
    new: compose ? "1" : undefined,
    q: query,
    filter: unreadOnly ? "unread" : undefined,
    people: compose ? direction : undefined,
    page: page > 1 ? String(page) : undefined,
  };
  const rawBefore = param(params.before, 11);
  const before = /^\d{1,10}$/.test(rawBefore) && Number(rawBefore) <= 2147483647 ? Number(rawBefore) : undefined;
  const user = await requireUser(href({ ...location, with: handle, before: before?.toString() }));

  if (!user.verified) {
    return (
      <div className="px-4 py-8">
        <h1 className="mb-6 text-3xl font-semibold">Chat</h1>
        <ConfirmEmailCard email={user.email ?? ""} doing="send messages" />
      </div>
    );
  }

  const [conversations, people, selected] = await Promise.all([
    compose ? [] : listConversations(user.id, query, unreadOnly, handle ? undefined : before),
    compose && (hasSearch || direction) ? searchChatMembers(user.id, query, direction, page) : [],
    handle ? findChatMember(user.id, handle) : null,
  ]);
  const history = selected ? await getMessageHistory(user.id, selected.id, before) : null;
  const unreadIds = history?.messages.filter((message) => message.senderId !== user.id && !message.readAt).map((message) => message.id) ?? [];
  const olderConversations = conversations.length > 40 ? conversations[39].messageId : undefined;
  const latest = history?.messages.at(-1);
  const hasDetail = Boolean(rawHandle);
  const inboxHref = href(location);

  return (
    <div className="grid h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-72 bg-paper md:h-[clamp(480px,calc(100dvh-140px),900px)] md:grid-cols-[minmax(290px,340px)_minmax(0,1fr)] md:rounded-2xl md:border md:border-line">
      <ChatLive unreadIds={unreadIds} />
      <section className={`${hasDetail ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col md:border-r md:border-line`}>
        <div className="border-b border-line px-4 pb-3 pt-5 sm:px-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Chat</h1>
            <Link href={compose ? "/chat" : href({ new: "1", people: "followers" })} className={compose ? "btn-ghost min-h-10 px-3" : "btn-primary min-h-10 gap-1.5 px-3"}>
              {compose ? "Back to inbox" : <><ChatIcon className="h-4 w-4" /> New message</>}
            </Link>
          </div>
          <form action="/chat" method="get" role="search" className="flex items-center gap-1 rounded-full border border-line bg-field px-3 focus-within:border-ink">
            {compose && <input type="hidden" name="new" value="1" />}
            {location.people && <input type="hidden" name="people" value={location.people} />}
            {!compose && unreadOnly && <input type="hidden" name="filter" value="unread" />}
            <input
              key={`${compose}:${query}`}
              type="search"
              name="q"
              aria-label={compose ? "Search members" : "Search conversations"}
              placeholder={compose ? "Name or @handle" : "Search conversations"}
              defaultValue={query}
              maxLength={100}
              className="min-w-0 flex-1 py-2.5 text-base outline-none"
            />
            <button type="submit" aria-label={compose ? "Find members" : "Find conversations"} className="grid h-10 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-line">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
              </svg>
            </button>
          </form>
          {compose ? (
            <nav className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Find people by connection">
              <Filter href={href({ new: "1", people: "followers", q: query })} current={peopleScope === "followers"}>Followers</Filter>
              <Filter href={href({ new: "1", people: "following", q: query })} current={peopleScope === "following"}>Following</Filter>
              <Filter href={href({ new: "1", q: query })} current={peopleScope === "all"}>All members</Filter>
            </nav>
          ) : (
            <nav className="mt-3 flex gap-2 text-sm" aria-label="Filter conversations">
              <Filter href={href({ q: query })} current={!unreadOnly}>All</Filter>
              <Filter href={href({ q: query, filter: "unread" })} current={unreadOnly}>Unread</Filter>
            </nav>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {compose ? (
            <>
              {people.length ? (
                <ul>
                  {people.slice(0, followPageSize).map((person) => (
                    <MemberRow key={person.id} person={person} url={href({ ...location, with: person.handle })} selected={person.id === selected?.id} />
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-5 text-sm text-ink-soft">
                  {page > 1 ? "No people on this page." : hasSearch ? "No matching members." : peopleScope === "followers"
                    ? "No followers available to message. Try All members."
                    : peopleScope === "following" ? "Nobody you follow is available to message. Try All members."
                      : "Find someone by their name or @handle."}
                </p>
              )}
              {(page > 1 || people.length > followPageSize) && (
                <nav aria-label="Member search pages" className="flex gap-4 px-3 py-2 text-sm">
                  {page > 1 && <Link href={href({ ...location, page: page > 2 ? String(page - 1) : undefined })} className="underline underline-offset-4">Previous</Link>}
                  {people.length > followPageSize && <Link href={href({ ...location, page: String(page + 1) })} className="underline underline-offset-4">Next</Link>}
                </nav>
              )}
            </>
          ) : conversations.length ? (
            <ul>
              {conversations.slice(0, 40).map((conversation) => (
                <MemberRow
                  key={conversation.id}
                  person={conversation}
                  url={href({ ...location, with: conversation.handle })}
                  selected={conversation.id === selected?.id}
                  preview={`${conversation.senderId === user.id ? "You: " : ""}${conversation.body}`}
                  time={conversation.createdAt}
                  unread={conversation.unread}
                />
              ))}
            </ul>
          ) : (
            <div className="px-3 py-5">
              <p className="font-semibold">{query ? "No matching conversations" : unreadOnly ? "You're all caught up" : "No conversations yet"}</p>
              {!query && !unreadOnly && <p className="mt-1 text-sm text-ink-soft">Start a conversation with another member.</p>}
            </div>
          )}
          {!compose && (
            <div className="flex gap-4 px-3 py-2 text-sm">
              {before && !hasDetail && <Link href={inboxHref} className="underline underline-offset-4">Newest</Link>}
              {olderConversations && <Link href={href({ ...location, before: String(olderConversations) })} className="underline underline-offset-4">Older conversations</Link>}
            </div>
          )}
        </div>
      </section>

      <section aria-label="Conversation" className={`${hasDetail ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col bg-field/35 md:rounded-r-2xl`}>
        {hasDetail && <h1 className="sr-only md:hidden">Chat</h1>}
        {selected && history ? (
          <>
            <div className="flex min-h-16 items-center gap-3 border-b border-line bg-paper px-4 py-2 md:rounded-tr-2xl sm:px-6">
              <Back href={inboxHref} label={compose ? "Back to people" : "Back to inbox"} />
              <Avatar name={selected.name} file={selected.avatarFile} className="h-9 w-9 shrink-0 text-sm" />
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold"><Link href={`/u/${selected.handle}`} className="hover:underline">{selected.name}</Link></h2>
                <p className="truncate text-sm text-muted">@{selected.handle}</p>
              </div>
            </div>
            <ChatHistory key={`${selected.id}:${before ?? ""}`} latestId={latest?.id} ownLatest={latest?.senderId === user.id} older={Boolean(before)}>
              {(history.older || before) && (
                <div className="mb-4 flex justify-center gap-4 text-sm">
                  {history.older && <Link href={href({ ...location, with: handle, before: String(history.older) })} className="underline underline-offset-4">Older messages</Link>}
                  {before && <Link href={href({ ...location, with: handle })} className="underline underline-offset-4">Latest messages</Link>}
                </div>
              )}
              {history.messages.length ? (
                <ol className="space-y-3">
                  {history.messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      id={message.id}
                      body={message.body}
                      own={message.senderId === user.id}
                      author={selected.name}
                      time={formatDate(message.createdAt)}
                      dateTime={message.createdAt.toISOString()}
                      edited={Boolean(message.editedAt)}
                      editableUntil={message.createdAt.getTime() + EDIT_WINDOW_MS}
                      reactions={message.reactions.map((reaction) => ({ emoji: reaction.emoji, mine: reaction.userId === user.id }))}
                      seen={message === latest && message.senderId === user.id && Boolean(message.readAt)}
                    />
                  ))}
                </ol>
              ) : (
                <p className="py-6 text-center text-sm text-ink-soft">{before ? "No earlier messages." : `Say hello to ${selected.name}.`}</p>
              )}
            </ChatHistory>
            {!before && <ChatComposer key={selected.id} handle={selected.handle} maxLength={MAX_MESSAGE_LENGTH} />}
          </>
        ) : (
          <div className="grid flex-1 place-content-center justify-items-center gap-3 px-6 text-center">
            <ChatIcon className="h-9 w-9 text-ink-soft" />
            <h2 className="text-xl font-semibold">{hasDetail ? "Member unavailable" : "Your conversations"}</h2>
            {hasDetail ? <Link href={inboxHref} className="text-sm underline underline-offset-4">Back to inbox</Link> : <p className="text-sm text-ink-soft">Open a conversation or start a new message.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function Filter({ href: url, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link href={url} aria-current={current ? "page" : undefined} className={`rounded-full px-3.5 py-2 font-semibold ${current ? "bg-ink text-paper" : "bg-field text-ink-soft hover:bg-line"}`}>
      {children}
    </Link>
  );
}

function Back({ href: url, label }: { href: string; label: string }) {
  return (
    <Link href={url} aria-label={label} className="-ml-2 grid h-11 w-10 shrink-0 place-items-center rounded-full hover:bg-field md:hidden">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m14 6-6 6 6 6" />
      </svg>
    </Link>
  );
}

function MemberRow({ person, url, selected, preview, time, unread }: {
  person: Member;
  url: string;
  selected: boolean;
  preview?: string;
  time?: Date;
  unread?: boolean;
}) {
  return (
    <li>
      <Link href={url} prefetch={false} aria-current={selected ? "page" : undefined} className={`flex min-h-17 items-center gap-3 rounded-lg px-3 py-2.5 ${selected ? "bg-field" : "hover:bg-field/65"}`}>
        <Avatar name={person.name} file={person.avatarFile} className="h-11 w-11 shrink-0 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className={`flex-1 truncate ${unread ? "font-bold" : "font-semibold"}`}>{person.name}</p>
            {time && <time dateTime={time.toISOString()} className="shrink-0 text-xs text-muted">{formatShortDate(time)}</time>}
          </div>
          <p className={`truncate text-sm ${unread ? "font-medium text-ink" : "text-muted"}`}>{preview ?? `@${person.handle}`}</p>
        </div>
        {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-heavy"><span className="sr-only">Unread</span></span>}
      </Link>
    </li>
  );
}
