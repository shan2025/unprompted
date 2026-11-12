import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageForm } from "@/components/AuthPageForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Log in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to follow creators, ask about work you love, and keep track of what you share or buy."
      coverSlug="auth-writing"
      coverCategory="writing"
      panelHeading="Good to see you again."
      panelPoints={["Pick up where you left off", "See new work from creators you follow", "Track what you've shared and bought"]}
    >
      <Suspense fallback={<div className="h-72" />}>
        <AuthPageForm mode="login" searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
