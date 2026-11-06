import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/data";
import { safeNext } from "@/lib/format";
import { AuthForm } from "./AuthForm";

export async function AuthPageForm({
  mode,
  searchParams,
}: {
  mode: "login" | "signup";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const param = (await searchParams).next;
  const next = safeNext(Array.isArray(param) ? param[0] : param, "");
  // Already logged in, including when a login has just set the session cookie.
  const user = await getCurrentUser();
  if (user) redirect(next || (await homePath(user.id)));
  return <AuthForm mode={mode} next={next} />;
}
