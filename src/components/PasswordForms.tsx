"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { requestPasswordReset, resetPassword } from "@/app/actions/password";

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="bg-accent-soft px-4 py-3 text-sm font-medium text-ink">
      {children}
    </p>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);

  if (state?.sent) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-ink">
          If an account exists for <strong>{state.email}</strong>, we&apos;ve sent it a link to choose a new password. It
          expires in an hour.
        </p>
        <p className="text-sm text-muted">Nothing arrived? Check your spam folder, or try again in a few minutes.</p>
        <Link href="/login" className="link text-sm text-ink">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" className="field" defaultValue={state?.email} autoComplete="email" required />
      </div>
      {state?.error && <Alert>{state.error}</Alert>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "One moment…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="link font-semibold text-ink">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);

  // Full page load so nothing from before the password change is reused.
  useEffect(() => {
    if (state?.next) window.location.assign(state.next);
  }, [state]);

  if (!token) {
    return (
      <p className="text-ink-soft">
        This link is incomplete. <Link href="/forgot-password" className="link text-ink">Ask for a new one</Link>.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="label">
          New password
        </label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
        <p className="hint">At least 8 characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          Type it again
        </label>
        <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && (
        <Alert>
          {state.error}{" "}
          {state.error.includes("expired") && (
            <Link href="/forgot-password" className="link">
              Get a new link
            </Link>
          )}
        </Alert>
      )}
      <button className="btn-primary w-full" disabled={pending || Boolean(state?.next)}>
        {pending || state?.next ? "One moment…" : "Save new password"}
      </button>
    </form>
  );
}
