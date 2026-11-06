"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { login, signup } from "@/app/actions/auth";

export function AuthForm({ mode, next, google, googleError }: { mode: "login" | "signup"; next: string; google?: boolean; googleError?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, null);

  useEffect(() => {
    if (state?.next) window.location.assign(state.next);
  }, [state]);
  const v = state?.values ?? {};
  const other = mode === "login" ? "/signup" : "/login";
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;
  const googleHref = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";

  return (
    <>
    {google && (
      <div className="mb-6 space-y-4">
        {/* A plain link: the route sends the browser on to Google, which a client-side navigation can't follow. */}
        <a href={googleHref} className="btn-ghost flex w-full items-center justify-center gap-3 normal-case tracking-normal">
          <GoogleMark />
          Continue with Google
        </a>
        {mode === "login" && (
          <p className="text-xs leading-relaxed text-muted">
            No account yet? Continuing with Google makes one, and you agree to our{" "}
            <Link href="/terms" className="link text-ink-soft">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link text-ink-soft">
              privacy policy
            </Link>{" "}
            and confirm you&apos;re 18 or older.
          </p>
        )}
        {googleError && (
          <p role="alert" className="rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink">
            {googleError}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>
      </div>
    )}
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <>
          <div>
            <label htmlFor="name" className="label">
              Your name
            </label>
            <input id="name" name="name" className="field" defaultValue={v.name} autoComplete="name" required />
          </div>
        </>
      )}
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" className="field" defaultValue={v.email} autoComplete="email" required />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
        {mode === "signup" ? (
          <p className="hint">At least 8 characters.</p>
        ) : (
          <Link href="/forgot-password" className="mt-2 inline-block text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            Forgot password?
          </Link>
        )}
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink">
          {state.error}
        </p>
      )}
      {mode === "signup" && (
        <p className="text-xs leading-relaxed text-muted">
          By creating an account, with Google or a password, you agree to our{" "}
          <Link href="/terms" className="link text-ink-soft">
            terms
          </Link>{" "}
          and confirm you&apos;ve read our{" "}
          <Link href="/privacy" className="link text-ink-soft">
            privacy policy
          </Link>
          , and that you are 18 or older.
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending || Boolean(state?.next)}>
        {pending || state?.next ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={otherHref} className="link font-semibold text-ink">
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
