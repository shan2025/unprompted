import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/PasswordForms";

export const metadata: Metadata = { title: "Forgot your password?" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-light">Forgot your password?</h1>
      <p className="mt-2 text-ink-soft">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <div className="card mt-8 p-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
