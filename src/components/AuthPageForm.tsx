import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/data";
import { safeNext } from "@/lib/format";
import { googleEnabled } from "@/lib/google";
import { AuthForm } from "./AuthForm";

export async function AuthPageForm({
  mode,
  searchParams,
}: {
  mode: "login" | "signup";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(first(params.next), "");
  // Already logged in, including when a login has just set the session cookie.
  const user = await getCurrentUser();
  if (user) redirect(next || (await homePath(user.id)));
  const error = GOOGLE_ERRORS[first(params.error) ?? ""];
  return <AuthForm mode={mode} next={next} google={googleEnabled()} googleError={error} />;
}

// Set by the Google sign-in routes when they send someone back here.
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't work. Try again, or use your email and password.",
  "google-off": "Google sign-in isn't available right now. Use your email and password.",
  "google-limit": "Too many new accounts from this connection. Try again in an hour.",
};
