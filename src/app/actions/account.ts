"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { deleteAccount } from "@/lib/account-deletion";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { escapeHtml, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/format";
import { withinLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";
import { track } from "@/lib/track";

export type DeleteAccountState = { message?: string } | null;

/** Deletes the signed-in account once they've typed their profile handle to confirm. */
export async function deleteMyAccount(_prev: DeleteAccountState, fd: FormData): Promise<DeleteAccountState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };
  const typed = String(fd.get("confirm") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (typed !== user.handle) return { message: `Type ${user.handle} exactly to confirm.` };
  if (!(await withinLimit(`delete-account:user:${user.id}`, 5, 60 * 60))) return { message: "Too many tries. Wait an hour and try again." };

  const result = await deleteAccount(user.id);
  if ("blocked" in result) return { message: result.blocked };

  await destroySession();
  // Strip who they were from their analytics profile; what's left is an ID that no longer matches anyone.
  track(user, "account_deleted", {}, { handle: null, name: null, verified: null, deleted: true });
  const { email, name } = result;
  if (email) {
    after(() => sendEmail({
      to: email,
      subject: "Your Unprompters account has been deleted",
      text: `Hi ${name.split(" ")[0]},\n\nYour Unprompters account and its personal data have been deleted, as you asked. Sales records we must keep by law no longer carry your name or contact details.\n\nIf you didn't do this, reply to this email.\n\n${siteUrl()}\n\nUnprompters`,
      html: `<p>Hi ${escapeHtml(name.split(" ")[0])},</p><p>Your Unprompters account and its personal data have been deleted, as you asked. Sales records we must keep by law no longer carry your name or contact details.</p><p>If you didn't do this, reply to this email.</p><p>Unprompters</p>`,
    }).catch((error: unknown) => reportError({ where: "account deletion email", message: String(error) })));
  }
  revalidatePath("/", "layout");
  redirect("/account-deleted");
}
