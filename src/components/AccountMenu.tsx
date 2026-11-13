"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { LogoutButton } from "./LogoutButton";

const ITEM = "block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-line/50";

const SMALL_PRINT = [
  { href: "/standard", label: "How scoring works" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

export function AccountMenu({
  name,
  handle,
  avatarFile,
  isAdmin,
  creator,
}: {
  name: string;
  handle: string;
  avatarFile: string | null;
  isAdmin: boolean;
  creator: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="block rounded-full hover:opacity-80"
      >
        <Avatar name={name} file={avatarFile} className="h-8 w-8 text-xs ring-[1.5px] ring-ink md:h-10 md:w-10 md:text-sm md:ring-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 border border-line bg-white py-1 shadow-lg">
          <p className="truncate border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">{name}</p>
          <Link href={`/u/${handle}`} className={ITEM} onClick={close}>
            View profile
          </Link>
          <Link href="/dashboard/profile" className={ITEM} onClick={close}>
            Edit profile
          </Link>
          <Link href="/dashboard" className={ITEM} onClick={close}>
            {creator ? "Dashboard" : "Your account"}
          </Link>
          {!creator && (
            <Link href="/journal/new" className={ITEM} onClick={close}>
              Share your work
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className={ITEM} onClick={close}>
              Review queue
            </Link>
          )}
          <div className="mt-1 border-t border-line pt-1">
            <LogoutButton className={ITEM} />
          </div>
          {/* Phones have no footer, so the trust and legal pages live here, small and quiet. */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-4 py-3 md:hidden">
            {SMALL_PRINT.map((l) => (
              <Link key={l.href} href={l.href} className="py-0.5 text-xs text-muted active:text-ink" onClick={close}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
