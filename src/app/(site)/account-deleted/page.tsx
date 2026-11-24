import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false } };

export default function AccountDeletedPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="intro-rise text-4xl font-light">Your account is deleted</h1>
      <p className="intro-rise mt-3 text-ink-soft" style={{ "--d": "70ms" } as React.CSSProperties}>
        Your profile, work and personal details are gone, and you&apos;ve been logged out. If you had an email address on the
        account, we&apos;ve sent a confirmation there.
      </p>
      <div className="intro-rise mt-8 flex flex-wrap justify-center gap-3" style={{ "--d": "140ms" } as React.CSSProperties}>
        <Link href="/explore" className="btn-ghost px-6 py-3">
          Keep exploring
        </Link>
      </div>
    </div>
  );
}
