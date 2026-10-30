import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";

// Phones get the essentials; the rest appear as the screen widens. Anything
// hidden here is also reachable from the dashboard or the footer.
export function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8 lg:gap-10">
        <Link href="/" aria-label="Unprompters home" className="shrink-0">
          <Logo compact />
        </Link>
        <nav className="hidden items-center gap-6 whitespace-nowrap text-[15px] text-ink md:flex lg:gap-8">
          <Link href="/explore" className="hover:opacity-60">
            Explore
          </Link>
          <Link href="/journal" className="hover:opacity-60">
            Journal
          </Link>
          <Link href="/standard" className="hidden hover:opacity-60 xl:inline">
            How scoring works
          </Link>
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<div className="h-11 w-36" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-3.5 whitespace-nowrap sm:gap-6">
        <Link href="/explore" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60 md:hidden">
          Explore
        </Link>
        <Link href="/journal" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60 md:hidden">
          Journal
        </Link>
        <Link href="/login" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
          Log in
        </Link>
        <Link href="/start" className="btn-primary hidden px-5 py-3 sm:inline-flex">
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 whitespace-nowrap sm:gap-6">
      {user.role === "admin" && (
        <Link href="/admin" className="hidden text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60 xl:inline">
          Review queue
        </Link>
      )}
      <Link href="/dashboard" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
        <span className="hidden sm:inline">@{user.handle}</span>
        <span className="sm:hidden">You</span>
      </Link>
      <LogoutButton className="hidden text-[13px] font-semibold uppercase tracking-[0.08em] text-muted hover:text-ink lg:block" />
      <Link href="/journal" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60 md:hidden">
        Journal
      </Link>
      <Link href="/journal/new" className="btn-ghost hidden px-5 py-3 lg:inline-flex">
        Write
      </Link>
      <Link href="/sell" className="btn-primary px-5 py-3">
        Sell
      </Link>
    </div>
  );
}
