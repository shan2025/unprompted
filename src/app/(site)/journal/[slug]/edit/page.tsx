import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostForm } from "@/components/PostForm";
import { requireUser } from "@/lib/auth";
import { getPost } from "@/lib/journal";
import { isAutoEvidence, type EditablePost } from "@/lib/post-form";

export const metadata: Metadata = { title: "Edit post", robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default function EditPostPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Journal</p>
      <h1 className="mt-1 text-4xl font-light sm:text-5xl">Edit your post</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Change anything you like. When you save, the post is scored again and goes back up with your changes.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Gate params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function Gate({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/journal/${slug}/edit`);
  const row = await getPost(slug);
  // Only the author edits. A post a moderator removed stays removed.
  if (!row || row.post.authorId !== user.id || row.post.status === "removed") notFound();
  const { post } = row;

  const editable: EditablePost = {
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle,
    category: post.category,
    body: post.body,
    videoUrl: post.videoUrl,
    aiNotes: post.aiNotes,
    coverFile: post.coverFile,
    disclosure: post.disclosure,
    evidence: post.evidence.map((e, index) => ({ ...e, index })).filter((e) => !isAutoEvidence(e)),
  };
  return <PostForm post={editable} />;
}
