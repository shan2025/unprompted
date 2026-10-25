import type { Metadata } from "next";
import { Suspense } from "react";
import { SellForm } from "@/components/SellForm";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { LEVELS, type Level } from "@/lib/scoring";

export const metadata: Metadata = { title: "Sell your work" };

export default function SellPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow">New listing</p>
      <h1 className="mt-1 text-4xl font-light sm:text-5xl">List something you made</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Tell buyers what it is, where AI was and wasn&apos;t involved, and show how you made it. You&apos;ll see your score
        before anything is published.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Gate searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Gate({ searchParams }: Props) {
  const query = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const category = one(query.category);
  const ai = one(query.ai);
  const prefill = {
    category: isCategory(category) ? category : undefined,
    ai: (LEVELS as readonly string[]).includes(ai ?? "") ? (ai as Level) : undefined,
  };
  const qs = new URLSearchParams();
  if (prefill.category) qs.set("category", prefill.category);
  if (prefill.ai) qs.set("ai", prefill.ai);
  await requireUser(qs.size ? `/sell?${qs}` : "/sell");
  return <SellForm defaultCategory={prefill.category} defaultAi={prefill.ai} />;
}
