"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import { phoneLogin } from "@/app/actions/phone";
import { formatPhone, looksLikePhone } from "@/lib/phone";
import { PhoneCodeStep } from "./PhoneForms";

const ALERT = "rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink";

/**
 * Log in or sign up. With `phone` on, the box takes an email or a phone number:
 * an email uses a password as before, and a phone number gets a texted code.
 */
export function AuthForm({
  mode,
  next,
  google,
  phone,
  googleError,
}: {
  mode: "login" | "signup";
  next: string;
  google?: boolean;
  phone?: boolean;
  googleError?: string;
}) {
  const [emailState, emailAction, emailPending] = useActionState(mode === "login" ? login : signup, null);
  const [phoneState, phoneAction, phonePending] = useActionState(phoneLogin, null);
  const [identifier, setIdentifier] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const redirectTo = emailState?.next ?? phoneState?.next;
  useEffect(() => {
    if (redirectTo) window.location.assign(redirectTo);
  }, [redirectTo]);

  // "Use a different number" comes back to this form with the number filled in.
  const [shownPhone, setShownPhone] = useState<string | undefined>();
  if (phoneState?.step === "number" && phoneState.phone && phoneState.phone !== shownPhone) {
    setShownPhone(phoneState.phone);
    setIdentifier(formatPhone(phoneState.phone));
  }

  const usingPhone = Boolean(phone) && looksLikePhone(identifier);
  const v = emailState?.values ?? {};
  const other = mode === "login" ? "/signup" : "/login";
  const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;
  const googleHref = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : "/api/auth/google";

  if (phoneState?.step === "code") {
    return <PhoneCodeStep state={phoneState} action={phoneAction} pending={phonePending} next={next} />;
  }

  const pending = usingPhone ? phonePending : emailPending;
  const error = usingPhone ? phoneState?.error : emailState?.error;

  return (
    <>
      {/* Shown first, so someone sent back from Google sees why straight away. */}
      {googleError && (
        <p role="alert" className={`mb-4 ${ALERT}`}>
          {googleError}
        </p>
      )}
      <form action={usingPhone ? phoneAction : emailAction} className="auth-form">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={mode} />
        {usingPhone && <input type="hidden" name="intent" value="send" />}
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="label">
              Your name
            </label>
            <input id="name" name="name" className="field" placeholder="Enter your name" defaultValue={v.name ?? phoneState?.name} autoComplete="name" required />
          </div>
        )}
        <div>
          <label htmlFor="identifier" className="label">
            {phone ? "Email or phone number" : "Email"}
          </label>
          <div className="auth-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <rect x="2" y="4.5" width="20" height="15" rx="2" />
              <path d="m3 6 9 6.5L21 6" />
            </svg>
            <input
              id="identifier"
              name="identifier"
              type={phone ? "text" : "email"}
              inputMode={usingPhone ? "tel" : "email"}
              className="field"
              placeholder={phone ? "Enter your email or phone number" : "Enter your email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete={phone ? "username" : "email"}
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>
          {usingPhone && <p className="hint">We&apos;ll text you a code. Outside India? Start with + and your country code.</p>}
        </div>
        {!usingPhone && (
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="auth-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <rect x="4" y="10" width="16" height="12" rx="2" />
                <path d="M7 10V7a5 5 0 0 1 10 0v3m-5 5v3" />
              </svg>
              <input
                id="password"
                name="password"
                type={passwordVisible ? "text" : "password"}
                className="field auth-password"
                placeholder={mode === "login" ? "Enter your password" : "Create a password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "signup" ? 8 : undefined}
                required
              />
              <button
                type="button"
                className="auth-reveal"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-controls="password"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                  <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {passwordVisible && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>
            {mode === "signup" && <p className="hint">At least 8 characters.</p>}
          </div>
        )}
        {mode === "login" && !usingPhone && (
          <Link href="/forgot-password" className="link auth-forgot">Forgot password?</Link>
        )}
        {error && (
          <p role="alert" className={ALERT}>
            {error}
          </p>
        )}
        {(mode === "signup" || usingPhone) && (
          <p className="text-xs leading-relaxed text-muted">
            {mode === "signup" ? "By creating an account" : "If this number is new to us, we'll make you an account. By continuing"}, you agree to our{" "}
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
        <button className="btn-primary w-full" disabled={pending || Boolean(redirectTo)}>
          {pending || redirectTo ? "One moment…" : usingPhone ? "Text me a code" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      {google && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
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
        </div>
      )}

      <p className="auth-switch">
        {mode === "login" ? "New to Unprompters? " : "Already have an account? "}
        <Link href={otherHref} className="link ml-1 font-semibold text-ink">
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
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
