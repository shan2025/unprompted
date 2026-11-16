"use server";

import { clientIp, withinLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

/** An error that happened in a visitor's browser, sent from the error screen. Anyone can call this, so it is capped per connection. */
export async function reportClientError(input: { message?: unknown; path?: unknown }) {
  const message = typeof input?.message === "string" ? input.message.slice(0, 500) : "";
  const path = typeof input?.path === "string" && input.path.startsWith("/") ? input.path.split("?")[0].slice(0, 200) : undefined;
  if (!message) return;
  try {
    if (!(await withinLimit(`error:from:${await clientIp()}`, 5, 60 * 60))) return;
  } catch {
    return;
  }
  await reportError({ where: "browser", message, path });
}
