import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageForm } from "@/components/AuthPageForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Log in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Unprompters account.">
      <Suspense fallback={<div className="h-72" />}>
        <AuthPageForm mode="login" searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
