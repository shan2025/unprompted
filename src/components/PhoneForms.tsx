"use client";

import { useActionState } from "react";
import { addEmail, linkPhone, type PhoneLoginState } from "@/app/actions/phone";
import { formatPhone } from "@/lib/phone";

const ALERT = "rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-ink";

function CodeField() {
  return (
    <div>
      <label htmlFor="code" className="label">
        6-digit code
      </label>
      <input
        id="code"
        name="code"
        className="field tracking-[0.3em]"
        inputMode="numeric"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        autoComplete="one-time-code"
        autoFocus
        required
      />
    </div>
  );
}

/**
 * The second step of logging in or signing up with a phone number: type the
 * texted code. Asks for a name too when the number is new and we don't have one.
 */
export function PhoneCodeStep({
  state,
  action,
  pending,
  next,
}: {
  state: NonNullable<PhoneLoginState>;
  action: (fd: FormData) => void;
  pending: boolean;
  next: string;
}) {
  const done = Boolean(state.next);
  const askName = state.isNew && !state.name;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-ink-soft">
        {state.resent ? "We texted a new code to " : "We texted a code to "}
        <strong className="font-semibold text-ink">{formatPhone(state.phone ?? "")}</strong>.
      </p>
      <CodeField />
      {askName && (
        <div>
          <label htmlFor="name" className="label">
            Your name
          </label>
          <input id="name" name="name" className="field" autoComplete="name" required />
          <p className="hint">This number is new here, so we&apos;ll make you an account.</p>
        </div>
      )}
      {state.error && (
        <p role="alert" className={ALERT}>
          {state.error}
        </p>
      )}
      <button name="intent" value="verify" className="btn-primary w-full" disabled={pending || done}>
        {pending || done ? "One moment…" : state.isNew ? "Create account" : "Log in"}
      </button>
      <div className="flex justify-between gap-4 text-sm">
        {/* formNoValidate: these don't need a code typed in. */}
        <button name="intent" value="change" formNoValidate className="text-ink-soft underline underline-offset-4 hover:text-ink" disabled={pending}>
          Use a different number
        </button>
        <button name="intent" value="resend" formNoValidate className="text-ink-soft underline underline-offset-4 hover:text-ink" disabled={pending}>
          Send a new code
        </button>
      </div>
    </form>
  );
}

/** Edit profile: add, change or remove the account's phone number. */
export function LinkPhoneForm({ phone, hasEmail }: { phone: string | null; hasEmail: boolean }) {
  const [state, action, pending] = useActionState(linkPhone, null);

  if (state?.step === "code") {
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm text-ink-soft">
          Enter the code we texted to <strong className="font-semibold text-ink">{formatPhone(state.phone ?? "")}</strong>.
        </p>
        <CodeField />
        {state.error && <p className="text-sm font-medium text-heavy">{state.error}</p>}
        <div className="flex flex-wrap gap-3">
          <button name="intent" value="verify" className="btn-primary" disabled={pending}>
            {pending ? "Checking…" : "Confirm number"}
          </button>
          <button name="intent" value="change" formNoValidate className="btn-ghost" disabled={pending}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {phone && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">{formatPhone(phone)}</p>
          {hasEmail && (
            <form action={action}>
              <button name="intent" value="remove" className="text-xs font-semibold text-muted hover:text-ink" disabled={pending}>
                Remove
              </button>
            </form>
          )}
        </div>
      )}
      {state?.done && <p className="text-sm text-ink-soft">Number confirmed. You can now log in with it.</p>}
      <form action={action} className="space-y-3">
        <input type="hidden" name="intent" value="send" />
        <div>
          <label htmlFor="phone" className="label">
            Mobile number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="field"
            defaultValue={state?.phone ? formatPhone(state.phone) : undefined}
            placeholder="98765 43210"
            autoComplete="tel"
            required
          />
          <p className="hint">We&apos;ll text a code to confirm it. Outside India? Start with + and your country code.</p>
        </div>
        {state?.error && <p className="text-sm font-medium text-heavy">{state.error}</p>}
        <button className="btn-ghost" disabled={pending}>
          {pending ? "Sending…" : phone ? "Change number" : "Add phone number"}
        </button>
      </form>
    </div>
  );
}

/** Edit profile, for phone-only accounts: add an email. */
export function AddEmailForm() {
  const [state, action, pending] = useActionState(addEmail, null);
  if (state?.ok) return <p className="text-sm text-ink-soft">{state.ok}</p>;
  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="add-email" className="label">
          Email
        </label>
        <input id="add-email" name="email" type="email" className="field" autoComplete="email" required />
        <p className="hint">Needed to ask creators questions, and for emails about your work and orders.</p>
      </div>
      {state?.error && <p className="text-sm font-medium text-heavy">{state.error}</p>}
      <button className="btn-ghost" disabled={pending}>
        {pending ? "Adding…" : "Add email"}
      </button>
    </form>
  );
}
