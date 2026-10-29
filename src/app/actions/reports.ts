"use server";

import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type ReportState = { ok?: boolean; message?: string } | null;

const REASONS = ["undisclosed-ai", "stolen", "misleading", "abusive", "other"] as const;
const TARGETS = { listing: "listingId", post: "postId", comment: "commentId" } as const;
type Target = keyof typeof TARGETS;

export async function submitReport(_prev: ReportState, fd: FormData): Promise<ReportState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Log in to report something." };

  const target = String(fd.get("target") ?? "");
  const id = Number(fd.get("id"));
  const reason = String(fd.get("reason") ?? "");
  const details = String(fd.get("details") ?? "").trim().slice(0, 1000);
  if (!(target in TARGETS) || !Number.isInteger(id) || !(REASONS as readonly string[]).includes(reason)) {
    return { message: "Pick a reason." };
  }

  const column = schema.flags[TARGETS[target as Target]];
  const [existing] = await db
    .select({ id: schema.flags.id })
    .from(schema.flags)
    .where(and(eq(column, id), eq(schema.flags.reporterId, user.id), eq(schema.flags.status, "open")))
    .limit(1);
  if (existing) return { ok: true, message: "You've already reported this. A moderator will look at it." };

  await db.insert(schema.flags).values({
    [TARGETS[target as Target]]: id,
    reporterId: user.id,
    reason: reason as (typeof REASONS)[number],
    details,
  });
  return { ok: true, message: "Thanks. A moderator will review this." };
}
