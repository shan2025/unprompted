"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

// Full page load afterwards, so nothing from the signed-in session lingers.
export function LogoutButton({ className }: { className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logout();
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload is the point
          window.location.assign("/");
        })
      }
    >
      Log out
    </button>
  );
}
