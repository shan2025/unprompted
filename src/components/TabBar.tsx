"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// Phones get the main sections as a tab bar along the bottom, within thumb
// reach, the way social apps do it. Tablets and up keep them in the header.

type Tab = { href: string; label: string; icon: (active: boolean) => React.ReactNode; exact?: boolean };

const TABS: Tab[] = [
  { href: "/", label: "Home", exact: true, icon: (a) => <HomeIcon filled={a} /> },
  { href: "/explore", label: "Explore", icon: (a) => <SearchIcon bold={a} /> },
  { href: "/journal/new", label: "Share", icon: () => <PlusIcon /> },
  { href: "/marketplace", label: "Shop", icon: (a) => <BagIcon filled={a} /> },
  { href: "/journal", label: "Journal", icon: (a) => <BookIcon filled={a} /> },
];

export function TabBar() {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <Suspense fallback={<Tabs pathname="" />}>
        <Current />
      </Suspense>
    </nav>
  );
}

/** Keeps the end of each page clear of the fixed tab bar. */
export function TabBarSpacer() {
  return <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />;
}

function Current() {
  return <Tabs pathname={usePathname()} />;
}

function isActive(tab: Tab, pathname: string) {
  if (tab.exact) return pathname === tab.href;
  // "/journal" shouldn't light up while writing a new post.
  if (tab.href === "/journal" && pathname === "/journal/new") return false;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

function Tabs({ pathname }: { pathname: string }) {
  return (
    <ul className="mx-auto flex h-16 max-w-md items-stretch justify-around">
      {TABS.map((tab) => {
        const active = isActive(tab, pathname);
        return (
          <li key={tab.href} className="flex flex-1">
            <Link
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-[3px] transition-[scale] duration-150 ease-out [-webkit-tap-highlight-color:transparent] active:scale-90 ${
                active ? "text-ink" : "text-[#595959]"
              }`}
            >
              {tab.icon(active)}
              <span className={`text-[11px] leading-none ${active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const ICON = "h-6 w-6";

function HomeIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3.5 10.5 12 3.5l8.5 7V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ bold }: { bold: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth={bold ? 2.8 : 1.8} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.5-4.5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 8h14l-1 12.5H6z" fill={filled ? "currentColor" : "none"} strokeLinejoin="round" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" strokeLinecap="round" stroke={filled ? "var(--paper)" : "currentColor"} />
    </svg>
  );
}

function BookIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z" fill={filled ? "currentColor" : "none"} strokeLinejoin="round" />
      <path d="M5 17.5a2 2 0 0 1 2-2h11.5" stroke={filled ? "var(--paper)" : "currentColor"} />
    </svg>
  );
}
