import type { Metadata } from "next";
import { Suspense } from "react";
import { PostForm } from "@/components/PostForm";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { LEVELS, type Level } from "@/lib/scoring";

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
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const category = one(query.category);
  const ai = one(query.ai);
  // Answers from Get started prefill the form.
  const prefill = {
    category: isCategory(category) ? category : undefined,
    ai: (LEVELS as readonly string[]).includes(ai ?? "") ? (ai as Level) : undefined,
  };
  const qs = new URLSearchParams();
  if (prefill.category) qs.set("category", prefill.category);
  if (prefill.ai) qs.set("ai", prefill.ai);
  await requireUser(qs.size ? `/journal/new?${qs}` : "/journal/new", { newcomers: true });
  return <PostForm defaultCategory={prefill.category} defaultAi={prefill.ai} />;
}
