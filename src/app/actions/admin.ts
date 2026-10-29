"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";

// revalidatePath rather than refresh(): in testing on Next 16.4, refresh()
// didn't update the queue when the page had been opened with a full load.

export async function reviewListing(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "approve" && decision !== "remove")) return;
  await db
    .update(schema.listings)
    .set({ status: decision === "approve" ? "published" : "removed" })
    .where(eq(schema.listings.id, id));
  revalidatePath("/admin");
}

export async function reviewPost(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "approve" && decision !== "remove")) return;
  await db
    .update(schema.posts)
    .set({ status: decision === "approve" ? "published" : "removed" })
    .where(eq(schema.posts.id, id));
  revalidatePath("/admin");
}

/** Upholding a report removes whatever it points at: a listing, a post or a comment. */
export async function resolveFlag(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const decision = fd.get("decision");
  if (!Number.isInteger(id) || (decision !== "dismiss" && decision !== "uphold")) return;

  const [flag] = await db.select().from(schema.flags).where(eq(schema.flags.id, id)).limit(1);
  if (!flag) return;
  await db
    .update(schema.flags)
    .set({ status: decision === "uphold" ? "upheld" : "dismissed" })
    .where(eq(schema.flags.id, id));
  if (decision === "uphold") {
    if (flag.listingId !== null) {
      await db.update(schema.listings).set({ status: "removed" }).where(eq(schema.listings.id, flag.listingId));
    } else if (flag.postId !== null) {
      await db.update(schema.posts).set({ status: "removed" }).where(eq(schema.posts.id, flag.postId));
    } else if (flag.commentId !== null) {
      await db.update(schema.postComments).set({ status: "removed" }).where(eq(schema.postComments.id, flag.commentId));
    }
  }
  revalidatePath("/admin");
}
