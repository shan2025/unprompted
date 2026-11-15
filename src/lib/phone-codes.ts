import "server-only";
import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { clientIp, withinLimit } from "./rate-limit";
import { sendSmsCode } from "./sms";

// One-time codes for logging in with a phone number, sent by text message. A code lasts ten minutes, allows five
// guesses, and only the newest code for a number works.

const { phoneCodes } = schema;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const hashCode = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

export type IssueResult = { ok: true } | { ok: false; error: string };

/** Makes a code for `phone` and texts it, within the rate limits. */
export async function issueCode(phone: string): Promise<IssueResult> {
  // Each message costs money and can be used to pester someone, so cap both sides.
  const ipOk = await withinLimit(`sms-send:ip:${await clientIp()}`, 10, 60 * 60);
  const phoneOk = await withinLimit(`sms-send:phone:${phone}`, 5, 60 * 60);
  if (!ipOk || !phoneOk) return { ok: false, error: "Too many codes requested. Try again in an hour." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(phoneCodes).values({
    phone,
    codeHash: hashCode(phone, code),
    expiresAt: sql`now() + make_interval(mins => ${CODE_MINUTES})`,
  });
  const sent = await sendSmsCode(phone, code);
  return sent ? { ok: true } : { ok: false, error: "We couldn't send a text to that number. Check it and try again." };
}

/** True when `code` is the newest live code for `phone`. Uses up the code on success. */
export async function checkCode(phone: string, code: string) {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return false;

  const [latest] = await db
    .select({ id: phoneCodes.id, codeHash: phoneCodes.codeHash, attempts: phoneCodes.attempts })
    .from(phoneCodes)
    .where(and(eq(phoneCodes.phone, phone), isNull(phoneCodes.usedAt), gt(phoneCodes.expiresAt, sql`now()`)))
    .orderBy(desc(phoneCodes.createdAt))
    .limit(1);
  if (!latest || latest.attempts >= MAX_ATTEMPTS) return false;

  if (latest.codeHash !== hashCode(phone, clean)) {
    await db.update(phoneCodes).set({ attempts: sql`${phoneCodes.attempts} + 1` }).where(eq(phoneCodes.id, latest.id));
    return false;
  }
  // Claim it in one statement, so the same code can't log in twice.
  const [claimed] = await db
    .update(phoneCodes)
    .set({ usedAt: sql`now()` })
    .where(and(eq(phoneCodes.id, latest.id), isNull(phoneCodes.usedAt)))
    .returning({ id: phoneCodes.id });
  return Boolean(claimed);
}
