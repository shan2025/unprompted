import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Onboarding, type Goal } from "@/components/Onboarding";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Get started" };

const GOALS: readonly string[] = ["share", "sell", "buy"] satisfies Goal[];
const isGoal = (v: unknown): v is Goal => typeof v === "string" && GOALS.includes(v);

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function StartPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Start searchParams={searchParams} />
    </Suspense>
  );
}

async function Start({ searchParams }: Props) {
  if (await getCurrentUser()) redirect("/journal/new");
  // A Share button links to /start?goal=share, which skips "What brings you
  // here?" and opens on "What do you make?".
  const goal = (await searchParams).goal;
  return <Onboarding signedIn={false} initialGoal={isGoal(goal) ? goal : undefined} />;
}
