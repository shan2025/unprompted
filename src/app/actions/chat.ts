"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { findChatMember, MAX_MESSAGE_LENGTH } from "@/lib/chat";
import { db, schema } from "@/lib/db";
import { UNVERIFIED_MESSAGE } from "@/lib/email-verification";
import { withinLimit } from "@/lib/rate-limit";

const { directMessages } = schema;

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
  refresh();
  return { sentId: message.id };
}

export async function markDirectMessagesRead(ids: number[]) {
  const user = await getCurrentUser();
  if (!user?.verified || !Array.isArray(ids) || !ids.length || ids.length > 50) return;
  if (ids.some((id) => !Number.isInteger(id) || id < 1 || id > 2147483647)) return;

  const updated = await db.update(directMessages).set({ readAt: sql`now()` })
    .where(and(eq(directMessages.recipientId, user.id), isNull(directMessages.readAt), inArray(directMessages.id, ids)))
    .returning({ id: directMessages.id });
  if (updated.length) refresh();
}
