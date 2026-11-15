import { DraftWorkspace } from "@/components/DraftWorkspace";
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
      <p className="eyebrow intro-rise">Journal</p>
      <h1 className="intro-rise mt-1 text-4xl font-light sm:text-5xl" style={{ "--d": "80ms" } as React.CSSProperties}>
        Edit your post
      </h1>
      <p className="intro-rise mt-3 max-w-2xl text-lg text-ink-soft" style={{ "--d": "160ms" } as React.CSSProperties}>
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
  // Only the author can submit a revision.
  if (!row || row.post.authorId !== user.id) notFound();
  const { post } = row;

  const editable: EditablePost = {
    slug: post.slug,
    workVersion: post.analysis.analyzedAt,
    title: post.title,
    subtitle: post.subtitle,
    category: post.category,
    body: post.body,
    videoUrl: post.videoUrl,
    aiNotes: post.aiNotes,
    coverFile: post.coverFile,
    coverTheme: post.coverTheme,
    coverPattern: post.coverPattern,
    disclosure: post.disclosure,
    evidence: post.evidence.map((e, index) => ({ ...e, index })).filter((e) => !isAutoEvidence(e)),
  };
  return <><p className="mb-5 text-sm text-ink-soft">{post.moderationReason || (post.status === "removed" ? "This post was removed. Submit a revised version for a moderator to review." : "Changes to work under review return to the review queue.")}</p><DraftWorkspace userId={user.id} kind="post" targetSlug={post.slug}><PostForm post={editable} /></DraftWorkspace></>;
}
