import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-7 sm:px-6">
        <Link href="/" aria-label="Unprompted home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-ink-soft">
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>
          <Link href="/standard" className="hidden hover:text-ink md:inline">
            How scoring works
          </Link>
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<div className="h-10 w-32" />}>
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
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink">
          Log in
        </Link>
        <Link href="/sell" className="btn-primary px-4 py-2">
          <span>
            Sell<span className="hidden sm:inline"> your work</span>
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {user.role === "admin" && (
        <Link href="/admin" className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:inline">
          Review queue
        </Link>
      )}
      <Link href="/dashboard" className="text-sm font-medium text-ink-soft hover:text-ink">
        <span className="hidden sm:inline">@{user.handle}</span>
        <span className="sm:hidden">You</span>
      </Link>
      <form action={logout} className="hidden sm:block">
        <button className="text-sm font-medium text-muted hover:text-ink">Log out</button>
      </form>
      <Link href="/sell" className="btn-primary px-4 py-2">
        Sell
      </Link>
    </div>
  );
}
