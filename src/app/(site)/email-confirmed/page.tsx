import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResendVerification } from "@/components/VerifyEmail";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

type Props = { searchParams: Promise<{ status?: string }> };

export default function EmailConfirmedPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <Suspense fallback={<div className="h-48" />}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: Props) {
  const [{ status }, user] = await Promise.all([searchParams, getCurrentUser()]);

  if (status === "ok" || user?.emailVerified) {
    return (
      <>
        <h1 className="text-4xl font-light">Email confirmed</h1>
        <p className="mt-3 text-ink-soft">Thanks. You can now share work, comment and ask creators questions.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/journal/new" className="btn-primary px-6 py-3">
            Share something
          </Link>
          <Link href="/explore" className="btn-ghost px-6 py-3">
            Explore
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-4xl font-light">That link didn&apos;t work</h1>
      <p className="mt-3 text-ink-soft">
        {status === "limit"
          ? "Too many tries from this connection. Wait an hour and click the link again."
          : "It may have expired (links last 24 hours) or already been used."}
      </p>
      <div className="mt-8 flex justify-center">
        {user ? (
          <ResendVerification className="btn-primary px-6 py-3" />
        ) : (
          <Link href="/login?next=%2Femail-confirmed" className="btn-primary px-6 py-3">
            Log in to get a new link
          </Link>
        )}
      </div>
    </>
  );
}
