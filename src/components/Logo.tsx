// A thumbprint mark: the one thing a prompt can't produce.
export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M8.5 23.5c-1.6-2.2-2.5-4.8-2.5-7.5C6 10.5 10.5 6 16 6c3.3 0 6.2 1.6 8 4" strokeWidth="1.8" />
      <path d="M11.5 25.5c-1.4-2.4-2.2-5.4-2-8.6.3-3.6 3-6.4 6.5-6.4 3.6 0 6.5 2.9 6.5 6.5 0 1.5-.2 3-.6 4.4" strokeWidth="1.8" />
      <path d="M15 26.5c-1.5-3-2-6.2-1.6-9.4.2-1.3 1.3-2.3 2.6-2.3 1.5 0 2.6 1.2 2.6 2.7 0 3-.6 5.8-1.8 8.4" strokeWidth="1.8" />
      <path d="M26 15.5c.2 2.3 0 4.6-.6 6.8" strokeWidth="1.8" />
      <path d="M20.5 26c.4-.9.8-1.9 1.1-2.9" strokeWidth="1.8" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 text-ink">
      <Mark className="h-7 w-7" />
      <span className="text-[17px] font-medium uppercase tracking-[0.14em]">Unprompted</span>
    </span>
  );
}
