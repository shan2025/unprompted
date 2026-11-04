"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "./LogoutButton";

const ITEM = "block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-line/50";

export function AccountMenu({ name, handle, isAdmin }: { name: string; handle: string; isAdmin: boolean }) {
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
        className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-white hover:opacity-80"
      >
        {name.trim().charAt(0) || "?"}
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
            Dashboard
          </Link>
          {isAdmin && (
            <Link href="/admin" className={ITEM} onClick={close}>
              Review queue
            </Link>
          )}
          <div className="mt-1 border-t border-line pt-1">
            <LogoutButton className={ITEM} />
          </div>
        </div>
      )}
    </div>
  );
}
