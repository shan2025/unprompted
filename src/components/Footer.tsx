import Link from "next/link";
import { Mark } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-sm text-ink-soft sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6">
        <div className="max-w-sm">
          <Mark className="mb-3 h-8 w-8 text-accent" />
          <p>
            A marketplace for work made by people. Every listing shows how much AI was involved, with the reasoning out in
            the open.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="eyebrow mb-1">Market</span>
          <Link href="/explore" className="hover:text-ink">
            Explore
          </Link>
          <Link href="/sell" className="hover:text-ink">
            Sell your work
          </Link>
          <Link href="/dashboard" className="hover:text-ink">
            Dashboard
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className="eyebrow mb-1">Trust</span>
          <Link href="/standard" className="hover:text-ink">
            How scoring works
          </Link>
          <Link href="/standard#limits" className="hover:text-ink">
            What detection can&apos;t do
          </Link>
          <Link href="/standard#disputes" className="hover:text-ink">
            Reviews &amp; disputes
          </Link>
        </div>
      </div>
    </footer>
  );
}
