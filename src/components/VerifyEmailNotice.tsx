import { getCurrentUser } from "@/lib/auth";
import { ResendVerification } from "./VerifyEmail";

/** A thin bar under the header for signed-in people who haven't confirmed their email yet. */
export async function VerifyEmailBanner() {
  const user = await getCurrentUser();
  if (!user || user.verified) return null;
  return (
    <div role="status" className="border-b border-line bg-field">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-8">
        <p className="min-w-0 flex-1">
          <strong className="font-semibold">Confirm your email.</strong>{" "}
          <span className="text-ink-soft">
            We sent a link to <span className="break-all">{user.email}</span>. Until you click it, you can look around but not post, comment or
            ask questions.
          </span>
        </p>
        <ResendVerification className="text-[13px] font-semibold uppercase tracking-[0.08em] underline-offset-4 hover:underline" />
      </div>
    </div>
  );
}

/** Shown in place of a form that needs a confirmed email. */
export function ConfirmEmailCard({ email, doing }: { email: string; doing: string }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h2 className="text-2xl font-light">Confirm your email to {doing}</h2>
      <p className="mt-3 text-ink-soft">
        We sent a link to <strong className="break-all font-medium text-ink">{email}</strong>. Click it, then come back to this page.
        Check your spam folder if it isn&apos;t there.
      </p>
      <div className="mt-6 flex justify-center">
        <ResendVerification />
      </div>
    </div>
  );
}
