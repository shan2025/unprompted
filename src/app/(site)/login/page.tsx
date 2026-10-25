import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageForm } from "@/components/AuthPageForm";

export const metadata: Metadata = { title: "Log in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-light">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Log in to buy, sell and keep track of your work.</p>
      <div className="card mt-8 p-6">
        <Suspense fallback={<div className="h-72" />}>
          <AuthPageForm mode="login" searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
