import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/format";
import { GOOGLE_COOKIE, googleEnabled, googleStart } from "@/lib/google";

/** Sends the person to Google to choose an account. `?next=` is where they land afterwards. */
export async function GET(request: NextRequest) {
  if (!googleEnabled()) redirect("/login?error=google-off");

  const next = safeNext(request.nextUrl.searchParams.get("next"), "");
  const { state, verifier, url } = googleStart();
  (await cookies()).set(GOOGLE_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    // Lax, so the cookie comes back on Google's redirect to our callback.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  redirect(url);
}
