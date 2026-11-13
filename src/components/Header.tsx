import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { isCreator } from "@/lib/data";
import { AccountMenu } from "./AccountMenu";
import { HideOnPath } from "./HideOnPath";
import { Logo, Mark } from "./Logo";
import { NavLink } from "./NavLink";

// Wide screens put the sections next to the logo; phones get them in the
// bottom tab bar (TabBar) and keep a slim bar up top, pinned like an app's.
// Posting tools appear as the screen widens; anything hidden here is also
// reachable from the tab bar, the account menu, the dashboard or the footer.
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:bg-white md:backdrop-blur-none">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8 md:h-[72px] lg:gap-10">
        <Link href="/" aria-label="Unprompters home" className="shrink-0">
          {/* Phones show the mark with a bold wordmark, like an app's title bar. */}
          <span className="inline-flex items-center gap-2 text-ink md:hidden">
            <Mark className="h-[26px] w-[26px]" />
            <span className="text-[19px] font-extrabold tracking-[-0.02em]">Unprompters</span>
          </span>
          <span className="hidden md:inline-flex">
            <Logo />
          </span>
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
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex items-center gap-3.5 whitespace-nowrap sm:gap-6">
        <HideOnPath path="/login">
          <Link href="/login" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
            Log in
          </Link>
        </HideOnPath>
        <HideOnPath path={["/start", "/signup"]}>
          <Link href="/start" className="btn-primary px-4 py-2.5 sm:px-5 sm:py-3">
            Get started
          </Link>
        </HideOnPath>
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
          <HideOnPath path="/journal/new">
            <Link href="/journal/new" className="btn-ghost hidden px-5 py-3 lg:inline-flex">
              Share
            </Link>
          </HideOnPath>
          {/* Sharing and selling are both "post something" pages; neither needs a Sell button on top. */}
          <HideOnPath path={["/sell", "/journal/new"]}>
            {/* A light outlined pill on phones, so the feed stays the loudest thing on screen. */}
            <Link
              href="/sell"
              className="inline-flex h-9 items-center rounded-full border-[1.5px] border-ink px-3.5 text-[13px] font-bold uppercase tracking-[0.06em] text-ink transition-[scale] duration-150 ease-out active:scale-[0.97] md:hidden"
            >
              Sell
            </Link>
            <Link href="/sell" className="btn-primary hidden px-5 py-3 md:inline-flex">
              Sell
            </Link>
          </HideOnPath>
        </>
      )}
      <AccountMenu name={user.name} handle={user.handle} avatarFile={user.avatarFile} isAdmin={user.role === "admin"} creator={creator} />
    </div>
  );
}
