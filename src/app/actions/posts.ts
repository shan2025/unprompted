"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assess, scoreColumns } from "@/lib/assess";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { safeNext } from "@/lib/format";
import { MAX_COMMENT, parsePostForm, type PostCreateState, type PostPreviewState } from "@/lib/post-form";
import { saveUpload } from "@/lib/uploads";

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "post"}-${randomBytes(3).toString("hex")}`;
}

/** Score a draft post without saving it. */
export async function previewPostAssessment(fd: FormData): Promise<PostPreviewState> {
  if (!(await getCurrentUser())) return { ok: false, errors: {}, message: "Your session expired. Log in again." };
  const parsed = await parsePostForm(fd, { requireAttestation: false });
  if (!parsed.values) return { ok: false, errors: parsed.errors };

  const v = parsed.values;
  const result = await assess({ ...v, preview: v.body, locked: "", image: v.image?.bytes });
  return {
    ok: true,
    result: {
      score: result.score,
      previewText: v.body,
      previewKind: result.preview?.kind ?? null,
      segments: result.preview?.segments ?? [],
      signals: result.preview?.signals ?? [],
      media: result.media,
      sources: result.sources,
    },
  };
}

export async function createPost(_prev: PostCreateState, fd: FormData): Promise<PostCreateState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };

  const parsed = await parsePostForm(fd, { requireAttestation: true });
  if (!parsed.values) return { errors: parsed.errors, message: "Some fields need attention." };
  const v = parsed.values;

  const result = await assess({ ...v, preview: v.body, locked: "", image: v.image?.bytes });
  if (result.score.blocked) {
    return {
      errors: { disclosure: "The Journal only shares work that is at least half human-made." },
      message: `Your disclosure works out to ${result.score.disclosedPercent}% AI, above the 50% limit.`,
    };
  }

  const coverFile = v.image ? await saveUpload(v.image.bytes, v.image.ext) : null;
  const slug = slugify(v.title);

  await db.insert(schema.posts).values({
    slug,
    authorId: user.id,
    title: v.title,
    category: v.category,
    body: v.body,
    aiNotes: v.aiNotes,
    coverFile,
    status: result.score.needsReview ? "in_review" : "published",
    disclosure: v.disclosure,
    ...scoreColumns(result),
  });

  redirect(`/journal/${slug}?created=1`);
}

async function findPublishedPost(slug: string) {
  const [post] = await db
    .select({ id: schema.posts.id, authorId: schema.posts.authorId, status: schema.posts.status })
    .from(schema.posts)
    .where(eq(schema.posts.slug, slug))
    .limit(1);
  return post?.status === "published" ? post : null;
}

export async function toggleAppreciation(slug: string) {
  const path = `/journal/${slug}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const post = await findPublishedPost(slug);
  if (!post || post.authorId === user.id) return;

  const where = and(eq(schema.postAppreciations.postId, post.id), eq(schema.postAppreciations.userId, user.id));
  const removed = await db.delete(schema.postAppreciations).where(where).returning({ postId: schema.postAppreciations.postId });
  if (removed.length === 0) {
    await db.insert(schema.postAppreciations).values({ postId: post.id, userId: user.id }).onConflictDoNothing();
  }
  revalidatePath(path);
}

export async function toggleFollow(handle: string, returnTo: string) {
  const back = safeNext(returnTo, `/u/${handle}`);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  const [target] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, handle)).limit(1);
  if (!target || target.id === user.id) return;

  const where = and(eq(schema.follows.followerId, user.id), eq(schema.follows.followingId, target.id));
  const removed = await db.delete(schema.follows).where(where).returning({ id: schema.follows.followerId });
  if (removed.length === 0) {
    await db.insert(schema.follows).values({ followerId: user.id, followingId: target.id }).onConflictDoNothing();
  }
  revalidatePath(back);
}

export type CommentState = { ok?: boolean; message?: string; key?: number } | null;

export async function addComment(_prev: CommentState, fd: FormData): Promise<CommentState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Log in to comment." };

  const slug = String(fd.get("slug") ?? "");
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { message: "Write a comment first." };
  if (body.length > MAX_COMMENT) return { message: `Keep comments under ${MAX_COMMENT.toLocaleString("en-US")} characters.` };

  const post = await findPublishedPost(slug);
  if (!post) return { message: "Comments are closed on this post." };

  await db.insert(schema.postComments).values({ postId: post.id, authorId: user.id, body });
  revalidatePath(`/journal/${slug}`);
  // A new key tells the form to clear itself.
  return { ok: true, key: Date.now() };
}

/** Authors can remove their own comments; moderators can remove any. */
export async function removeComment(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return;

  const [row] = await db
    .select({ authorId: schema.postComments.authorId, slug: schema.posts.slug })
    .from(schema.postComments)
    .innerJoin(schema.posts, eq(schema.postComments.postId, schema.posts.id))
    .where(eq(schema.postComments.id, id))
    .limit(1);
  if (!row || (row.authorId !== user.id && user.role !== "admin")) return;

  await db.update(schema.postComments).set({ status: "removed" }).where(eq(schema.postComments.id, id));
  revalidatePath(`/journal/${row.slug}`);
}
