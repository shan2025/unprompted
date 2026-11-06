import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isCreator } from "@/lib/data";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";

// Wide screens put the sections next to the logo; narrower ones give them a
// second row. Posting tools appear as the screen widens; anything hidden here
// is also reachable from the account menu, the dashboard or the footer.
export function Header() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8 lg:gap-10">
        <Link href="/" aria-label="Unprompters home" className="shrink-0">
          <Logo compact />
        </Link>
        <nav className="hidden items-center gap-6 whitespace-nowrap text-[15px] text-ink md:flex lg:gap-8">
          <NavLink href="/explore">Explore</NavLink>
          <NavLink href="/marketplace">Marketplace</NavLink>
          <NavLink href="/journal">Journal</NavLink>
          <NavLink href="/standard" className="hidden xl:inline">
            How scoring works
          </NavLink>
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<div className="h-11 w-36" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      {/* Phones and small tablets: the main sections get their own row, so none is left out. */}
      <nav
        aria-label="Sections"
        className="flex h-11 items-center gap-6 overflow-x-auto whitespace-nowrap border-t border-line px-4 text-[13px] font-semibold uppercase tracking-[0.08em] no-scrollbar sm:px-8 md:hidden"
      >
        <NavLink href="/explore">Explore</NavLink>
        <NavLink href="/marketplace">Marketplace</NavLink>
        <NavLink href="/journal">Journal</NavLink>
      </nav>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-3.5 whitespace-nowrap sm:gap-6">
        <Link href="/login" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
          Log in
        </Link>
        <Link href="/start" className="btn-primary px-4 py-2.5 sm:px-5 sm:py-3">
          Get started
        </Link>
      </div>
    );
  }

  // People here to explore don't see posting tools until they've shared something.
  // The account menu keeps a way in for when they do.
  const creator = await isCreator(user.id);

  return (
    <div className="flex items-center gap-3.5 whitespace-nowrap sm:gap-6">
      {creator && (
        <>
          <Link href="/journal/new" className="btn-ghost hidden px-5 py-3 lg:inline-flex">
            Share
          </Link>
          <Link href="/sell" className="btn-primary px-5 py-3">
            Sell
          </Link>
        </>
      )}
      <AccountMenu name={user.name} handle={user.handle} avatarFile={user.avatarFile} isAdmin={user.role === "admin"} creator={creator} />
    </div>
  );
}
