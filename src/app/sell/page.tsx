import type { Metadata } from "next";
import { Suspense } from "react";
import { SellForm } from "@/components/SellForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sell your work" };

export default function SellPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow">New listing</p>
      <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">List something you made</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-soft">
        Tell buyers what it is, where AI was and wasn&apos;t involved, and show how you made it. You&apos;ll see your score
        before anything is published.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="card h-96 animate-pulse" />}>
          <Gate />
        </Suspense>
      </div>
    </div>
  );
}

async function Gate() {
  await requireUser("/sell");
  return <SellForm />;
}
