import "server-only";
import { and, desc, eq, ilike, inArray, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { hideDemo } from "./demo";
import { followMemberIds, followPageSize, type FollowDirection } from "./journal";

const { directMessageReactions, directMessages, users } = schema;
const member = { id: users.id, handle: users.handle, name: users.name, avatarFile: users.avatarFile };
const historySize = 50;

export { MAX_MESSAGE_LENGTH } from "./chat-rules";

function realMember() {
  // The seed script uses this reserved domain for its preview accounts.
  return hideDemo() ? sql`(${users.email} is null or ${users.email} not like '%@unprompted.test')` : undefined;
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
  const rows = await db.select({
    id: directMessages.id,
    body: directMessages.body,
    senderId: directMessages.senderId,
    createdAt: directMessages.createdAt,
    readAt: directMessages.readAt,
    editedAt: directMessages.editedAt,
  }).from(directMessages)
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
