"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, null);
  const v = state?.values ?? {};
  const other = mode === "login" ? "/signup" : "/login";
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

  return (
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
        {mode === "signup" && <p className="hint">At least 8 characters.</p>}
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink">
          {state.error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={otherHref} className="link font-semibold text-ink">
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
    </form>
  );
}
