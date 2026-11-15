import "server-only";
import { and, desc, eq, ilike, lt, ne, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { hideDemo } from "./demo";

const { directMessages, users } = schema;
const member = { id: users.id, handle: users.handle, name: users.name, avatarFile: users.avatarFile };
const historySize = 50;

export const MAX_MESSAGE_LENGTH = 2000;

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

export function searchChatMembers(userId: number, query: string) {
  const pattern = contains(query.replace(/^@/, ""));
  return db.select(member).from(users)
    .where(and(ne(users.id, userId), realMember(), or(ilike(users.name, pattern), ilike(users.handle, pattern))))
    .orderBy(sql`${users.handle} = ${query.replace(/^@/, "").toLowerCase()} desc`, users.name, users.id)
    .limit(20);
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
  const messages = rows.slice(0, historySize).reverse();
  return { messages, older: rows.length > historySize ? messages[0].id : undefined };
}
