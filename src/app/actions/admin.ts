"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { parseWorkLink } from "@/lib/work-link";

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

// Founding Unprompters and featured work. Both change what the public sees
// on profiles, cards and the home page, so those are refreshed too.
function refreshPublic() {
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export type CurationState = { error?: string; ok?: string } | undefined;

/** Gives the Founding Unprompter badge, by handle. */
export async function setFounding(_prev: CurationState, fd: FormData): Promise<CurationState> {
  await requireAdmin();
  const handle = String(fd.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { error: "Enter a handle." };
  const [user] = await db
    .update(schema.users)
    .set({ founding: true })
    .where(eq(schema.users.handle, handle))
    .returning({ name: schema.users.name });
  if (!user) return { error: `No one has the handle @${handle}.` };
  refreshPublic();
  return { ok: `${user.name} is now a Founding Unprompter.` };
}

export async function removeFounding(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;
  await db.update(schema.users).set({ founding: false }).where(eq(schema.users.id, id));
  refreshPublic();
}

/** Puts a published post or listing in the home page's Featured row. */
export async function featureWork(_prev: CurationState, fd: FormData): Promise<CurationState> {
  await requireAdmin();
  const work = parseWorkLink(String(fd.get("link") ?? ""));
  if (!work) return { error: "Paste a link to a journal post or a listing, like /journal/my-post." };
  const now = new Date();
  const [row] =
    work.kind === "post"
      ? await db
          .update(schema.posts)
          .set({ featuredAt: now })
          .where(and(eq(schema.posts.slug, work.slug), eq(schema.posts.status, "published")))
          .returning({ title: schema.posts.title })
      : await db
          .update(schema.listings)
          .set({ featuredAt: now })
          .where(and(eq(schema.listings.slug, work.slug), inArray(schema.listings.status, ["published", "sold"])))
          .returning({ title: schema.listings.title });
  if (!row) return { error: "No published work at that link." };
  refreshPublic();
  return { ok: `Featured “${row.title}”.` };
}

export async function unfeatureWork(fd: FormData) {
  await requireAdmin();
  const id = Number(fd.get("id"));
  const kind = fd.get("kind");
  if (!Number.isInteger(id) || (kind !== "post" && kind !== "listing")) return;
  if (kind === "post") await db.update(schema.posts).set({ featuredAt: null }).where(eq(schema.posts.id, id));
  else await db.update(schema.listings).set({ featuredAt: null }).where(eq(schema.listings.id, id));
  refreshPublic();
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
