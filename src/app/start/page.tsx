import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Onboarding } from "@/components/Onboarding";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Get started" };

export default function StartPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Start />
    </Suspense>
  );
}

async function Start() {
  if (await getCurrentUser()) redirect("/journal/new");
  return <Onboarding signedIn={false} />;
}
