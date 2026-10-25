import { safeNext } from "@/lib/format";
import { AuthForm } from "./AuthForm";

export async function AuthPageForm({
  mode,
  searchParams,
}: {
  mode: "login" | "signup";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = (await searchParams).next;
  return <AuthForm mode={mode} next={safeNext(Array.isArray(next) ? next[0] : next, "")} />;
}
