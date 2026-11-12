import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { siteUrl } from "./format";
import { withinLimit } from "./rate-limit";

// Emails that tell a creator someone noticed their work: a new follower, a
// comment, an appreciation. Each one checks the person still wants them
// (Edit profile has the switch), and none is sent for your own actions.
// Callers run these with after(), so a slow or failed email never holds up the page.

type Actor = { id: number; name: string; handle: string };

async function recipient(userId: number) {
  const [row] = await db
    .select({ email: schema.users.email, name: schema.users.name, wants: schema.users.emailNotifications })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return row?.wants ? row : null;
}

async function send(to: { email: string; name: string }, subject: string, lines: string[], path: string) {
  const link = `${siteUrl()}${path}`;
  const settings = `${siteUrl()}/dashboard/profile#notifications`;
  const firstName = to.name.split(" ")[0];
  const footer = "You get these emails because someone interacted with your work on Unprompters. Turn them off in Edit profile:";
  await sendEmail({
    to: to.email,
    subject: subject.replace(/[\r\n]+/g, " "),
    text: `Hi ${firstName},\n\n${lines.join("\n\n")}\n\n${link}\n\n${footer} ${settings}\n\nUnprompters`,
    html:
      `<p>Hi ${escapeHtml(firstName)},</p>` +
      lines.map((l) => `<p style="white-space:pre-wrap">${escapeHtml(l)}</p>`).join("") +
      `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>` +
      `<p style="color:#777;font-size:12px">${escapeHtml(footer)} <a href="${escapeHtml(settings)}">notification settings</a>.</p><p>Unprompters</p>`,
  });
}

/** Someone followed this creator. Following, unfollowing and following again sends one email a day at most. */
export async function notifyFollow(follower: Actor, followingId: number) {
  if (follower.id === followingId) return;
  if (!(await withinLimit(`notify:follow:${follower.id}:${followingId}`, 1, 24 * 60 * 60))) return;
  const to = await recipient(followingId);
  if (!to) return;
  await send(to, `${follower.name} followed you on Unprompters`, [`${follower.name} (@${follower.handle}) is now following you, and will see your new work in their Following feed.`], `/u/${follower.handle}`);
}

/** Someone commented on this creator's post. Capped so a busy thread can't flood their inbox. */
export async function notifyComment(commenter: Actor, post: { id: number; authorId: number; slug: string; title: string }, body: string) {
  if (commenter.id === post.authorId) return;
  if (!(await withinLimit(`notify:comment:${post.authorId}`, 30, 24 * 60 * 60))) return;
  const to = await recipient(post.authorId);
  if (!to) return;
  const quote = body.length > 500 ? `${body.slice(0, 500)}…` : body;
  await send(to, `${commenter.name} commented on "${post.title}"`, [`${commenter.name} (@${commenter.handle}) commented on "${post.title}":`, quote], `/journal/${post.slug}#comments`);
}

/** Someone appreciated this creator's post. Toggling it off and on again doesn't send a second email. */
export async function notifyAppreciation(fan: Actor, post: { id: number; authorId: number; slug: string; title: string }) {
  if (fan.id === post.authorId) return;
  if (!(await withinLimit(`notify:appreciate:${fan.id}:${post.id}`, 1, 7 * 24 * 60 * 60))) return;
  if (!(await withinLimit(`notify:appreciate:${post.authorId}`, 30, 24 * 60 * 60))) return;
  const to = await recipient(post.authorId);
  if (!to) return;
  await send(to, `${fan.name} appreciated "${post.title}"`, [`${fan.name} (@${fan.handle}) appreciated your work "${post.title}".`], `/journal/${post.slug}`);
}
