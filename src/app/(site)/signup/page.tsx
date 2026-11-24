import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageForm } from "@/components/AuthPageForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <AuthShell title="Join Unprompters" subtitle="One account to explore, share and sell.">
      <Suspense fallback={<div className="h-96" />}>
        <AuthPageForm mode="signup" searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
