import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageForm } from "@/components/AuthPageForm";

export const metadata: Metadata = { title: "Create an account" };

export default function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-light">Join Unprompters</h1>
      <p className="mt-2 text-ink-soft">One account to buy and sell.</p>
      <div className="card mt-8 p-6">
        <Suspense fallback={<div className="h-96" />}>
          <AuthPageForm mode="signup" searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
