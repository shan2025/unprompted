"use server";

import { and, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { hideDemo } from "@/lib/demo";
import { escapeHtml, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";
import { MAX_QUESTION, MIN_QUESTION, type AskState } from "@/lib/inquiry";
import { withinLimit } from "@/lib/rate-limit";

const { listings, posts, users, inquiries } = schema;

/** A work people can ask about: public, and not one of the seeded demos, whose creators aren't real. */
async function findWork(target: string, slug: string) {
  if (target === "listing") {
    const [row] = await db
      .select({ id: listings.id, title: listings.title, creatorId: listings.creatorId, isDemo: listings.isDemo, creatorEmail: users.email, creatorName: users.name })
      .from(listings)
      .innerJoin(users, eq(listings.creatorId, users.id))
      .where(and(eq(listings.slug, slug), inArray(listings.status, ["published", "sold"])))
      .limit(1);
    return row ? { ...row, path: `/listing/${slug}`, column: "listingId" as const } : null;
  }
  if (target === "post") {
    const [row] = await db
      .select({ id: posts.id, title: posts.title, creatorId: posts.authorId, isDemo: posts.isDemo, creatorEmail: users.email, creatorName: users.name })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
      .limit(1);
    return row ? { ...row, path: `/journal/${slug}`, column: "postId" as const } : null;
  }
  return null;
}

export async function askCreator(_prev: AskState, fd: FormData): Promise<AskState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Log in to ask a question." };

  const message = String(fd.get("message") ?? "").trim();
  if (message.length < MIN_QUESTION) return { message: "Write a little more so they can answer you." };
  if (message.length > MAX_QUESTION) return { message: `Keep your question under ${MAX_QUESTION.toLocaleString("en-US")} characters.` };

  const work = await findWork(String(fd.get("target") ?? ""), String(fd.get("slug") ?? ""));
  if (!work || (work.isDemo && hideDemo())) return { message: "This work isn't available any more." };
  if (work.isDemo) return { message: "This is a demo, so there's nobody to ask." };
  if (work.creatorId === user.id) return { message: "This is your own work." };

  if (!(await withinLimit(`ask:user:${user.id}`, 10, 24 * 60 * 60))) {
    return { message: "You've reached the limit of 10 questions a day. Try again tomorrow." };
  }

  await db.insert(inquiries).values({ [work.column]: work.id, senderId: user.id, creatorId: work.creatorId, message });

  const link = `${siteUrl()}${work.path}`;
  const firstName = work.creatorName.split(" ")[0];
  // A failed email isn't a failed question: it's saved, and shows on their dashboard.
  await sendEmail({
    to: work.creatorEmail,
    replyTo: user.email,
    subject: `${user.name} asked about "${work.title}"`.replace(/[\r\n]+/g, " "),
    text: `Hi ${firstName},\n\n${user.name} asked about ${work.title} (${link}):\n\n${message}\n\nReply to this email to answer them. Your reply goes to their address, and they will see yours.\n\nUnprompters`,
    html: `<p>Hi ${escapeHtml(firstName)},</p><p>${escapeHtml(user.name)} asked about <a href="${escapeHtml(link)}">${escapeHtml(work.title)}</a>:</p><blockquote style="white-space:pre-wrap">${escapeHtml(message)}</blockquote><p>Reply to this email to answer them. Your reply goes to their address, and they will see yours.</p><p>Unprompters</p>`,
  });

  return { ok: true, key: Date.now() };
}
