"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False while server-rendering and hydrating, true once the page runs in the browser. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// The server doesn't know the viewer's timezone, so it renders UTC and the
// browser re-renders in local time right after hydrating.
function zone(client: boolean) {
  return client ? undefined : "UTC";
}

export function sameDay(a: Date, b: Date, client: boolean) {
  return dayKey(a, client) === dayKey(b, client);
}

export function dayKey(date: Date, client: boolean) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone(client), year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function clock(date: Date, client: boolean) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zone(client), hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function fullDay(date: Date, client: boolean) {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone(client), month: "short", day: "numeric", year: "numeric" }).format(date);
}

function shortDay(date: Date, client: boolean) {
  const thisYear = new Intl.DateTimeFormat("en-US", { timeZone: zone(client), year: "numeric" });
  const options: Intl.DateTimeFormatOptions = thisYear.format(date) === thisYear.format(new Date())
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  return new Intl.DateTimeFormat("en-US", { timeZone: zone(client), ...options }).format(date);
}

/**
 * "11:02" for today, otherwise "Nov 12" (inbox) or "Nov 12, 11:02" (thread),
 * in the viewer's own timezone.
 */
export function ChatTime({ iso, style = "list", className }: { iso: string; style?: "list" | "thread"; className?: string }) {
  const client = useIsClient();
  const date = new Date(iso);
  const today = sameDay(date, new Date(), client);
  const text = today ? clock(date, client) : style === "list" ? shortDay(date, client) : `${shortDay(date, client)}, ${clock(date, client)}`;
  return <time dateTime={iso} className={className}>{text}</time>;
}
