// The Founding Unprompter badge: one of the hand-picked first creators.
// "pill" spells it out on a profile; "mark" is a small seal next to a name on cards.

function Seal({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M8 3.6l1.3 2.7 2.9.4-2.1 2 .5 2.9L8 10.2l-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="var(--paper, #fff)" />
    </svg>
  );
}

export function FoundingBadge({ variant = "mark" }: { variant?: "pill" | "mark" }) {
  if (variant === "pill") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink py-1 pl-1.5 pr-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink">
        <Seal className="h-4 w-4 text-ink" />
        Founding Unprompter
      </span>
    );
  }
  return (
    <span title="Founding Unprompter" className="inline-flex shrink-0 align-[-2px]">
      <Seal className="h-3.5 w-3.5 text-ink" />
      <span className="sr-only">Founding Unprompter</span>
    </span>
  );
}
