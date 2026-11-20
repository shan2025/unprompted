import { DraftWorkspace } from "@/components/DraftWorkspace";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SellForm } from "@/components/SellForm";
import { ConfirmEmailCard } from "@/components/VerifyEmailNotice";
import { requireUser } from "@/lib/auth";
import { sellsThroughCashfree } from "@/lib/checkout";
import { isCategory } from "@/lib/categories";
import { LEVELS, type Level } from "@/lib/scoring";

export const metadata: Metadata = { title: "Sell your work" };

// Stagger delay for the intro animations in globals.css.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function SellPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="eyebrow intro-rise">New listing</p>
      <h1 className="intro-rise mt-1 text-4xl font-light sm:text-5xl" style={d(80)}>
        Sell your work
      </h1>
      <p className="intro-rise mt-3 max-w-2xl text-lg text-ink-soft" style={d(160)}>
        Add your product, set a price, and disclose how you made it.
      </p>
      <p className="intro-rise mt-3 text-ink-soft" style={d(220)}>
        Just showing what you made?{" "}
        <Link href="/journal/new" className="link font-semibold text-ink">Share your work</Link>
        {" · "}<Link href="/explore" className="link">Explore other people&apos;s work</Link>
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
  const user = await requireUser(qs.size ? `/sell?${qs}` : "/sell", { newcomers: true });
  if (!user.verified) return <ConfirmEmailCard email={user.email ?? ""} doing="sell your work" />;
  return <DraftWorkspace userId={user.id} kind="listing"><SellForm defaultCategory={prefill.category} defaultAi={prefill.ai} gatewayCheckout={sellsThroughCashfree(user)} /></DraftWorkspace>;
}
