import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { siteUrl } from "./format";

// People who sign up with an email and password confirm the address by clicking
// a link before they can post, sell, comment or ask. Google logins arrive
// verified, and so does anyone who uses a password-reset link.

const { users, emailVerifications } = schema;
const LINK_HOURS = 24;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function sendVerificationEmail(user: { id: number; name: string; email: string }) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(emailVerifications).values({
    id: sha256(token),
    userId: user.id,
    expiresAt: sql`now() + make_interval(hours => ${LINK_HOURS})`,
  });
  const link = `${siteUrl()}/api/auth/verify-email?token=${token}`;
  return sendEmail({
    to: user.email,
    subject: "Confirm your email for Unprompters",
    text: `Hi ${user.name},\n\nConfirm this is your email address, so you can share work, comment and ask creators questions:\n\n${link}\n\nThe link works for ${LINK_HOURS} hours. If you didn't sign up for Unprompters, you can ignore this email.\n\nUnprompters`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Confirm this is your email address, so you can share work, comment and ask creators questions:</p><p><a href="${link}">Confirm my email</a></p><p>The link works for ${LINK_HOURS} hours. If you didn't sign up for Unprompters, you can ignore this email.</p><p>Unprompters</p>`,
  });
}

/** Uses up a link. Returns the account it confirmed, or null when it's unknown, used or expired. */
export async function claimVerification(token: string) {
  if (!token) return null;
  const [claimed] = await db
    .update(emailVerifications)
    .set({ usedAt: sql`now()` })
    .where(and(eq(emailVerifications.id, sha256(token)), isNull(emailVerifications.usedAt), gt(emailVerifications.expiresAt, sql`now()`)))
    .returning({ userId: emailVerifications.userId });
  if (!claimed) return null;
  await markEmailVerified(claimed.userId);
  return claimed.userId;
}

/** Marks the address confirmed, keeping the first time it was. */
export async function markEmailVerified(userId: number) {
  await db.update(users).set({ emailVerifiedAt: sql`now()` }).where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
}

/** The message server actions return when an unconfirmed account tries something that needs a confirmed one. */
export const UNVERIFIED_MESSAGE = "Confirm your email first. We sent you a link; you can send a new one from the banner at the top of the page.";
