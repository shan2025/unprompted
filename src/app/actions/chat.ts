"use server";

import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { clearTyping, findChatMember, findOwnConversationMessage, getChatPulse, markTyping, MAX_MESSAGE_LENGTH } from "@/lib/chat";
import { canEdit, isReaction } from "@/lib/chat-rules";
import { db, schema } from "@/lib/db";
import { UNVERIFIED_MESSAGE } from "@/lib/email-verification";
import { withinLimit } from "@/lib/rate-limit";

const { directMessageReactions, directMessages } = schema;

function validId(id: unknown): id is number {
  return Number.isInteger(id) && (id as number) >= 1 && (id as number) <= 2147483647;
}

async function chatUser() {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to use chat." } as const;
  if (!user.verified) return { error: UNVERIFIED_MESSAGE } as const;
  return { user } as const;
}

export async function sendDirectMessage(
  handle: string,
  _previous: { error?: string; sentId?: number },
  form: FormData,
): Promise<{ error?: string; sentId?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log in to send a message." };
  if (!user.verified) return { error: UNVERIFIED_MESSAGE };

  const input = form.get("message");
  const body = typeof input === "string" ? input.trim() : "";
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) return { error: "Keep your message at 2,000 characters or fewer." };

  const recipient = await findChatMember(user.id, handle);
  if (!recipient) return { error: "This member isn't available for chat." };
  if (!(await withinLimit(`chat:user:${user.id}`, 30, 60))) {
    return { error: "You've sent several messages recently. Try again in a minute." };
  }

  const [message] = await db.insert(directMessages)
    .values({ senderId: user.id, recipientId: recipient.id, body })
    .returning({ id: directMessages.id });
  await clearTyping(user.id, recipient.id);
  refresh();
  return { sentId: message.id };
}

/** Tells the other person "typing…" for a few seconds. The composer renews it while the member types. */
export async function setTyping(handle: string, typing: boolean) {
  const user = await getCurrentUser();
  if (!user?.verified || typeof handle !== "string") return;
  const recipient = await findChatMember(user.id, handle.toLowerCase());
  if (!recipient) return;
  if (typing) await markTyping(user.id, recipient.id);
  else await clearTyping(user.id, recipient.id);
}

/** Polled by an open conversation: is the other person typing, and has a newer message arrived? */
export async function checkConversation(peerId: number) {
  const user = await getCurrentUser();
  if (!user?.verified || !validId(peerId) || peerId === user.id) return null;
  return getChatPulse(user.id, peerId);
}

export async function editDirectMessage(id: number, text: string): Promise<{ error?: string }> {
  const session = await chatUser();
  if (session.error) return { error: session.error };
  const { user } = session;
  if (!validId(id)) return { error: "This message can't be edited." };

  const body = typeof text === "string" ? text.trim() : "";
  if (!body) return { error: "A message can't be empty. Unsend it instead." };
  if (body.length > MAX_MESSAGE_LENGTH) return { error: "Keep your message at 2,000 characters or fewer." };

  const message = await findOwnConversationMessage(user.id, id);
  if (!message || message.senderId !== user.id) return { error: "This message can't be edited." };
  if (!canEdit(message.createdAt)) return { error: "Messages can only be edited for 15 minutes after sending." };
  if (!(await withinLimit(`chat:user:${user.id}`, 30, 60))) {
    return { error: "You've changed several messages recently. Try again in a minute." };
  }

  await db.update(directMessages)
    .set({ body, editedAt: sql`now()` })
    .where(and(eq(directMessages.id, id), eq(directMessages.senderId, user.id), sql`${directMessages.body} <> ${body}`));
  refresh();
  return {};
}

/** Unsends a message: it's removed for both people, along with its reactions. */
export async function deleteDirectMessage(id: number): Promise<{ error?: string }> {
  const session = await chatUser();
  if (session.error) return { error: session.error };
  if (!validId(id)) return { error: "This message can't be unsent." };

  const deleted = await db.delete(directMessages)
    .where(and(eq(directMessages.id, id), eq(directMessages.senderId, session.user.id)))
    .returning({ id: directMessages.id });
  if (!deleted.length) return { error: "This message can't be unsent." };
  refresh();
  return {};
}

/** Sets the member's reaction on a message, or clears it when `emoji` is null. */
export async function reactToDirectMessage(id: number, emoji: string | null): Promise<{ error?: string }> {
  const session = await chatUser();
  if (session.error) return { error: session.error };
  const { user } = session;
  if (!validId(id) || (emoji !== null && !isReaction(emoji))) return { error: "That reaction isn't available." };

  const message = await findOwnConversationMessage(user.id, id);
  if (!message) return { error: "This message is no longer available." };
  if (!(await withinLimit(`chat:react:${user.id}`, 60, 60))) {
    return { error: "You've reacted to a lot of messages recently. Try again in a minute." };
  }

  if (emoji === null) {
    await db.delete(directMessageReactions)
      .where(and(eq(directMessageReactions.messageId, id), eq(directMessageReactions.userId, user.id)));
  } else {
    await db.insert(directMessageReactions)
      .values({ messageId: id, userId: user.id, emoji })
      .onConflictDoUpdate({
        target: [directMessageReactions.messageId, directMessageReactions.userId],
        set: { emoji, createdAt: sql`now()` },
      });
  }
  refresh();
  return {};
}

export async function markDirectMessagesRead(ids: number[], through?: { peerId: number; messageId: number }) {
  const user = await getCurrentUser();
  if (!user?.verified) return;
  if (through && (!validId(through.peerId) || !validId(through.messageId))) return;
  if (!through && (!Array.isArray(ids) || !ids.length || ids.length > 50 || !ids.every(validId))) return;

  // The latest page acknowledges the conversation up to the history the client rendered.
  // An older page only acknowledges incoming messages on that page.
  const updated = await db.update(directMessages).set({ readAt: sql`now()` })
    .where(and(
      eq(directMessages.recipientId, user.id),
      isNull(directMessages.readAt),
      through
        ? and(eq(directMessages.senderId, through.peerId), lte(directMessages.id, through.messageId))
        : inArray(directMessages.id, ids),
    ))
    .returning({ id: directMessages.id });
  if (updated.length) refresh();
}
