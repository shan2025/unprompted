import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageForm } from "@/components/AuthPageForm";
import { Cover } from "@/components/Cover";

export const metadata: Metadata = { title: "Log in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      {/* A drawn cover, like the one beside onboarding, draws itself in above the form. */}
      <div className="intro-open cv-play card mb-8 h-28 overflow-hidden">
        <Cover slug="auth-writing" category="writing" palette={0} title="" className="h-full" />
      </div>
      <h1 className="intro-rise text-4xl font-light" style={{ "--d": "150ms" } as React.CSSProperties}>
        Welcome back
      </h1>
      <p className="intro-rise mt-2 text-ink-soft" style={{ "--d": "230ms" } as React.CSSProperties}>Log in to follow creators, ask about work you love, and keep track of what you share or buy.</p>
      <div className="intro-rise card mt-8 p-6" style={{ "--d": "310ms" } as React.CSSProperties}>
        <Suspense fallback={<div className="h-72" />}>
          <AuthPageForm mode="login" searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
