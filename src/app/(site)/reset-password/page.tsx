import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ResetPasswordPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-light">Choose a new password</h1>
      <p className="mt-2 text-ink-soft">After saving, you&apos;ll be logged in, and signed out everywhere else.</p>
      <div className="card mt-8 p-6">
        <Suspense fallback={<div className="h-64" />}>
          <TokenForm searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function TokenForm({ searchParams }: Props) {
  const token = (await searchParams).token;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}
