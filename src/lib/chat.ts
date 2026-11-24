import "server-only";
import { and, desc, eq, ilike, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "./db";
import { hideDemo } from "./demo";
import { followMemberIds, followPageSize, type FollowDirection } from "./journal";

const { directMessageReactions, directMessages, users } = schema;
const member = { id: users.id, handle: users.handle, name: users.name, avatarFile: users.avatarFile };
const historySize = 50;

export { MAX_MESSAGE_LENGTH } from "./chat-rules";

function realMember() {
  // Deleted accounts can't be messaged. The seed script uses a reserved domain for its preview accounts.
  return and(isNull(users.deletedAt), hideDemo() ? sql`(${users.email} is null or ${users.email} not like '%@unprompted.test')` : undefined);
}

function contains(query: string) {
  return `%${query.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function findChatMember(userId: number, handle: string) {
  const [person] = await db.select(member).from(users)
    .where(and(eq(users.handle, handle), ne(users.id, userId), realMember()))
    .limit(1);
  return person ?? null;
}

export function searchChatMembers(userId: number, query: string, direction?: FollowDirection, page = 1) {
  const term = query.replace(/^@/, "").trim();
  const pattern = contains(term);
  return db.select(member).from(users)
    .where(and(
      ne(users.id, userId),
      realMember(),
      direction ? inArray(users.id, followMemberIds(userId, direction)) : undefined,
      term ? or(ilike(users.name, pattern), ilike(users.handle, pattern)) : undefined,
    ))
    .orderBy(sql`${users.handle} = ${term.toLowerCase()} desc`, users.name, users.id)
    .limit(followPageSize + 1)
    .offset((page - 1) * followPageSize);
}

export function listConversations(userId: number, query: string, unreadOnly: boolean, before?: number) {
  const peer = sql<number>`case when ${directMessages.senderId} = ${userId}
    then ${directMessages.recipientId} else ${directMessages.senderId} end`;
  const conversations = db.select({
    peerId: peer.as("peer_id"),
    latestId: sql<number>`max(${directMessages.id})`.as("latest_id"),
    unread: sql<boolean>`bool_or(${directMessages.recipientId} = ${userId} and ${directMessages.readAt} is null)`.as("unread"),
  }).from(directMessages)
    .where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)))
    .groupBy(sql`1`).as("conversations");

  const pattern = contains(query);
  return db.select({
    ...member,
    messageId: directMessages.id,
    body: directMessages.body,
    senderId: directMessages.senderId,
    createdAt: directMessages.createdAt,
    unread: conversations.unread,
  }).from(conversations)
    .innerJoin(directMessages, eq(directMessages.id, conversations.latestId))
    .innerJoin(users, eq(users.id, conversations.peerId))
    .where(and(
      realMember(),
      unreadOnly ? eq(conversations.unread, true) : undefined,
      before ? lt(directMessages.id, before) : undefined,
      query ? or(ilike(users.name, pattern), ilike(users.handle, contains(query.replace(/^@/, ""))), ilike(directMessages.body, pattern)) : undefined,
    ))
    .orderBy(desc(directMessages.id))
    .limit(41);
}

export async function getMessageHistory(userId: number, peerId: number, before?: number) {
  const original = alias(directMessages, "reply_target");
  const rows = await db.select({
    id: directMessages.id,
    body: directMessages.body,
    senderId: directMessages.senderId,
    createdAt: directMessages.createdAt,
    readAt: directMessages.readAt,
    editedAt: directMessages.editedAt,
    reply: { senderId: original.senderId, body: original.body },
  }).from(directMessages)
    .leftJoin(original, and(
      eq(original.id, directMessages.replyToId),
      or(
        and(eq(original.senderId, userId), eq(original.recipientId, peerId)),
        and(eq(original.senderId, peerId), eq(original.recipientId, userId)),
      ),
    ))
    .where(and(
      or(
        and(eq(directMessages.senderId, userId), eq(directMessages.recipientId, peerId)),
        and(eq(directMessages.senderId, peerId), eq(directMessages.recipientId, userId)),
      ),
      before ? lt(directMessages.id, before) : undefined,
    ))
    .orderBy(desc(directMessages.id))
    .limit(historySize + 1);
  const page = rows.slice(0, historySize).reverse();
  const reactions = page.length
    ? await db.select({ messageId: directMessageReactions.messageId, userId: directMessageReactions.userId, emoji: directMessageReactions.emoji })
      .from(directMessageReactions)
      .where(inArray(directMessageReactions.messageId, page.map((message) => message.id)))
      .orderBy(directMessageReactions.createdAt)
    : [];
  const messages = page.map((message) => ({
    ...message,
    reactions: reactions.filter((reaction) => reaction.messageId === message.id).map(({ userId, emoji }) => ({ userId, emoji })),
  }));
  return { messages, older: rows.length > historySize ? messages[0].id : undefined };
}

// "Typing" is a short-lived signal, so it lives in the rate_limits table,
// which is already a self-cleaning store of keys that expire: the key says who
// is typing to whom and reset_at says when the signal lapses. Each keystroke
// burst renews it; it lapses on its own a few seconds after typing stops.
const TYPING_SECONDS = 6;

function typingKey(fromId: number, toId: number) {
  return `typing:${fromId}:${toId}`;
}

export async function markTyping(fromId: number, toId: number) {
  await db.execute(sql`
    insert into rate_limits (key, count, reset_at)
    values (${typingKey(fromId, toId)}, 1, now() + make_interval(secs => ${TYPING_SECONDS}))
    on conflict (key) do update set reset_at = excluded.reset_at`);
}

export async function clearTyping(fromId: number, toId: number) {
  await db.execute(sql`delete from rate_limits where key = ${typingKey(fromId, toId)}`);
}

/** Whether the peer is typing to the member right now, and the newest message between them. */
export async function getChatPulse(userId: number, peerId: number) {
  const [row] = await db.execute<{ typing: boolean; latest: number | null }>(sql`
    select
      exists(select 1 from rate_limits where key = ${typingKey(peerId, userId)} and reset_at > now()) as typing,
      (select max(id) from direct_messages
        where (sender_id = ${userId} and recipient_id = ${peerId})
           or (sender_id = ${peerId} and recipient_id = ${userId})) as latest`);
  return { typing: Boolean(row?.typing), latestId: row?.latest == null ? null : Number(row.latest) };
}

/** A message the member sent or received, or null if it isn't part of their conversations. */
export async function findOwnConversationMessage(userId: number, messageId: number) {
  const [message] = await db.select({
    id: directMessages.id,
    senderId: directMessages.senderId,
    recipientId: directMessages.recipientId,
    createdAt: directMessages.createdAt,
  }).from(directMessages)
    .where(and(eq(directMessages.id, messageId), or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId))))
    .limit(1);
  return message ?? null;
}
