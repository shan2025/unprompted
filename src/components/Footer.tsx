import Link from "next/link";
import { SITE } from "@/lib/site";
import { Mark } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 text-sm text-ink-soft sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Mark className="mb-3 h-8 w-8 text-ink" />
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
        <div className="flex flex-col gap-2">
          <span className="eyebrow mb-1">Legal</span>
          <Link href="/terms" className="hover:text-ink">
            Terms of service
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy policy
          </Link>
          <Link href="/refunds" className="hover:text-ink">
            Refunds
          </Link>
          <Link href="/contact" className="hover:text-ink">
            Contact
          </Link>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted sm:px-8">© 2026 {SITE.legalName}</p>
      </div>
    </footer>
  );
}
