import type { Metadata } from "next";
import { Suspense } from "react";
import { PostForm } from "@/components/PostForm";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";

export const metadata: Metadata = { title: "Write a post" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function NewPostPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Journal</p>
      <h1 className="mt-1 text-4xl font-light sm:text-5xl">Share something you made</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Not everything has to be for sale. Post an article, a poem, a sketch or a half-finished idea. It gets the same AI
        score as a listing, and you&apos;ll see yours before anything is published.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Gate searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Gate({ searchParams }: Props) {
  const query = await searchParams;
  const raw = Array.isArray(query.category) ? query.category[0] : query.category;
  const category = isCategory(raw) ? raw : undefined;
  await requireUser(category ? `/journal/new?category=${category}` : "/journal/new");
  return <PostForm defaultCategory={category} />;
}
