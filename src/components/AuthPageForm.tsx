import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { devAccountsEnabled } from "@/lib/dev-accounts";
import { safeNext } from "@/lib/format";
import { googleEnabled } from "@/lib/google";
import { phoneLoginEnabled } from "@/lib/sms";
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
  if (first(params.standard) !== "1" && await devAccountsEnabled()) {
    const accounts = await db.select({ id: schema.users.id, name: schema.users.name, handle: schema.users.handle, role: schema.users.role })
      .from(schema.users).orderBy(asc(schema.users.role), asc(schema.users.name), asc(schema.users.id));
    const query = new URLSearchParams({ standard: "1" });
    if (next) query.set("next", next);
    return (
      <div className="space-y-5">
        {accounts.length ? (
          <form method="post" action="/api/dev/session">
            <input name="next" type="hidden" value={next} />
            <label htmlFor="dev-account" className="label">Local test account</label>
            <select name="account" id="dev-account" className="field">
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} (@{account.handle}){account.role === "admin" ? " · Admin" : ""}
                </option>
              ))}
            </select>
            <button className="btn-primary mt-5 w-full" type="submit">Continue as selected account</button>
          </form>
        ) : <p>No local accounts yet. <Link href={`/signup?${query}`} className="link">Create the first account</Link></p>}
        <Link href={`/${mode}?${query}`} className="link text-sm">{mode === "signup" ? "Use regular sign-up" : "Use regular login"}</Link>
      </div>
    );
  }
  // Already logged in, including when a login has just set the session cookie.
  const user = await getCurrentUser();
  if (user) redirect(next || (await homePath(user.id)));
  const error = GOOGLE_ERRORS[first(params.error) ?? ""];
  return <AuthForm mode={mode} next={next} google={googleEnabled()} phone={phoneLoginEnabled()} googleError={error} />;
}

// Set by the Google sign-in routes when they send someone back here.
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Google sign-in didn't work. Try again, or use your email and password.",
  "google-off": "Google sign-in isn't available right now. Use your email and password.",
  "google-limit": "Too many new accounts from this connection. Try again in an hour.",
};
