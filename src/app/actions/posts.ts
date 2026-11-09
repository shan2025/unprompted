"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assess, scoreColumns } from "@/lib/assess";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { safeNext } from "@/lib/format";
import { MAX_EVIDENCE, UNREADABLE_EVIDENCE, UNREADABLE_IMAGE } from "@/lib/listing-form";
import {
  isAutoEvidence,
  MAX_COMMENT,
  parsePostForm,
  type ParsedPost,
  type PostCreateState,
  type PostPreviewState,
} from "@/lib/post-form";
import { withinLimit } from "@/lib/rate-limit";
import { deleteUploads, saveEvidenceFiles, saveUpload, saveWithUploads } from "@/lib/uploads";

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "post"}-${randomBytes(3).toString("hex")}`;
}

/**
 * For an edit: the author's own post, and what of it the form keeps (the image,
 * the evidence rows left ticked). Null if there's no such post to edit.
 */
async function loadEdit(fd: FormData, userId: number) {
  const slug = String(fd.get("editSlug") ?? "");
  if (!slug) return null;
  const [post] = await db.select().from(schema.posts).where(eq(schema.posts.slug, slug)).limit(1);
  if (!post || post.authorId !== userId || post.status === "removed") return null;

  const replacesImage = fd.get("cover") instanceof File && (fd.get("cover") as File).size > 0;
  const keepsImage = Boolean(post.coverFile) && !replacesImage && fd.get("remove_cover") !== "on";
  const ticked = new Set(fd.getAll("keep_evidence").map(Number));
  const kept = post.evidence.filter((e, i) => (isAutoEvidence(e) ? keepsImage : ticked.has(i)));
  return { post, keepsImage, kept, priorMedia: keepsImage ? post.analysis.media : null };
}

type Edit = NonNullable<Awaited<ReturnType<typeof loadEdit>>>;

/** Scores the form, counting what an edit keeps from the saved post. New evidence comes first so file indexes still line up. */
function assessPost(v: ParsedPost, edit: Edit | null) {
  return assess({
    ...v,
    evidence: [...v.evidence, ...(edit?.kept ?? [])],
    preview: v.body,
    locked: "",
    image: v.image?.bytes,
    priorMedia: edit?.priorMedia,
  });
}

/** Score a draft post without saving it. */
export async function previewPostAssessment(fd: FormData): Promise<PostPreviewState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, errors: {}, message: "Your session expired. Log in again." };
  const edit = await loadEdit(fd, user.id);
  const parsed = await parsePostForm(fd, { requireAttestation: false, keepsImage: edit?.keepsImage });
  if (!parsed.values) return { ok: false, errors: parsed.errors };
  if (!(await withinLimit(`preview:user:${user.id}`, 60, 60 * 60))) {
    return { ok: false, errors: {}, message: "That's a lot of score checks. Try again in an hour." };
  }

  const v = parsed.values;
  const result = await assessPost(v, edit);
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

  if (!(await withinLimit(`post:user:${user.id}`, 20, 24 * 60 * 60))) {
    return { message: "You've reached the limit of 20 new posts a day. Try again tomorrow." };
  }

  const coverFile = v.image ? await saveUpload(v.image.bytes) : null;
  if (v.image && !coverFile) return { errors: { cover: UNREADABLE_IMAGE }, message: "Some fields need attention." };
  const evidence = await saveEvidenceFiles(result.evidence, v.evidenceFiles);
  if (!evidence) {
    if (coverFile) await deleteUploads([coverFile]);
    return { errors: { evidence: UNREADABLE_EVIDENCE }, message: "Some fields need attention." };
  }
  const slug = slugify(v.title);

  await saveWithUploads([coverFile, ...v.evidenceFiles.map((f) => evidence[f.index].file)], () =>
    db.insert(schema.posts).values({
      slug,
      authorId: user.id,
      title: v.title,
      subtitle: v.subtitle,
      category: v.category,
      body: v.body,
      videoUrl: v.videoUrl,
      aiNotes: v.aiNotes,
      coverFile,
      status: result.score.needsReview ? "in_review" : "published",
      disclosure: v.disclosure,
      ...scoreColumns(result),
      evidence,
    }),
  );

  redirect(`/journal/${slug}?created=1`);
}

/**
 * Saves an edit and posts it again: the new version is scored from scratch and
 * goes live, or back to review, on that score. Comments and appreciations stay.
 */
export async function updatePost(_prev: PostCreateState, fd: FormData): Promise<PostCreateState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Your session expired. Log in again." };
  const edit = await loadEdit(fd, user.id);
  if (!edit) return { message: "This post can't be edited. It may have been deleted or removed." };
  const { post } = edit;

  const parsed = await parsePostForm(fd, { requireAttestation: true, keepsImage: edit.keepsImage });
  if (!parsed.values) return { errors: parsed.errors, message: "Some fields need attention." };
  const v = parsed.values;
  if (v.evidence.length + edit.kept.filter((e) => !isAutoEvidence(e)).length > MAX_EVIDENCE) {
    return { errors: { evidence: `Keep it to ${MAX_EVIDENCE} pieces of evidence in all.` }, message: "Some fields need attention." };
  }

  const result = await assessPost(v, edit);
  if (result.score.blocked) {
    return {
      errors: { disclosure: "The Journal only shares work that is at least half human-made." },
      message: `Your disclosure works out to ${result.score.disclosedPercent}% AI, above the 50% limit.`,
    };
  }
  if (!(await withinLimit(`post-edit:user:${user.id}`, 40, 24 * 60 * 60))) {
    return { message: "You've edited a lot today. Try again tomorrow." };
  }

  const newCover = v.image ? await saveUpload(v.image.bytes) : null;
  if (v.image && !newCover) return { errors: { cover: UNREADABLE_IMAGE }, message: "Some fields need attention." };
  const evidence = await saveEvidenceFiles(result.evidence, v.evidenceFiles);
  if (!evidence) {
    if (newCover) await deleteUploads([newCover]);
    return { errors: { evidence: UNREADABLE_EVIDENCE }, message: "Some fields need attention." };
  }
  const coverFile = newCover ?? (edit.keepsImage ? post.coverFile : null);

  await saveWithUploads([newCover, ...v.evidenceFiles.map((f) => evidence[f.index].file)], () =>
    db
      .update(schema.posts)
      .set({
        title: v.title,
        subtitle: v.subtitle,
        category: v.category,
        body: v.body,
        videoUrl: v.videoUrl,
        aiNotes: v.aiNotes,
        coverFile,
        status: result.score.needsReview ? "in_review" : "published",
        disclosure: v.disclosure,
        ...scoreColumns(result),
        evidence,
      })
      .where(eq(schema.posts.id, post.id)),
  );

  // Files the new version no longer uses have public addresses, so they go.
  const stillUsed = new Set([coverFile, ...evidence.map((e) => e.file)]);
  const unused = [post.coverFile, ...post.evidence.map((e) => e.file)].filter((name): name is string => name != null && !stillUsed.has(name));
  await deleteUploads(unused).catch(() => {});

  revalidatePath("/journal");
  revalidatePath(`/journal/${post.slug}`);
  revalidatePath(`/u/${user.handle}`);
  redirect(`/journal/${post.slug}?updated=1`);
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
  if (!(await withinLimit(`comment:user:${user.id}`, 10, 5 * 60))) {
    return { message: "You're commenting very quickly. Wait a few minutes and try again." };
  }

  await db.insert(schema.postComments).values({ postId: post.id, authorId: user.id, body });
  revalidatePath(`/journal/${slug}`);
  // A new key tells the form to clear itself.
  return { ok: true, key: Date.now() };
}

/** Authors can delete their own posts for good; moderators can delete any. Comments, appreciations and reports go with it. */
export async function deletePost(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const [post] = await db
    .select({ id: schema.posts.id, authorId: schema.posts.authorId, coverFile: schema.posts.coverFile, evidence: schema.posts.evidence })
    .from(schema.posts)
    .where(eq(schema.posts.slug, String(fd.get("slug") ?? "")))
    .limit(1);
  if (!post || (post.authorId !== user.id && user.role !== "admin")) return;

  // Uploads have public addresses, so the image and evidence files have to go too.
  const files = [post.coverFile, ...post.evidence.map((e) => e.file)].filter((name) => name != null);
  await db.transaction(async (tx) => {
    await tx.delete(schema.posts).where(eq(schema.posts.id, post.id));
    if (files.length) await tx.delete(schema.uploads).where(inArray(schema.uploads.name, files));
  });
  revalidatePath("/journal");
  revalidatePath(`/u/${user.handle}`);
  const fallback = post.authorId === user.id ? "/dashboard" : "/journal";
  redirect(safeNext(String(fd.get("returnTo") ?? ""), fallback));
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
