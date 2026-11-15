import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { claimVerification } from "@/lib/email-verification";
import { clientIp, withinLimit } from "@/lib/rate-limit";

/** The link in the confirmation email lands here, then on a page saying how it went. */
export async function GET(request: NextRequest) {
  if (!(await withinLimit(`verify:ip:${await clientIp()}`, 30, 60 * 60))) redirect("/email-confirmed?status=limit");
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const userId = await claimVerification(token);
  redirect(`/email-confirmed?status=${userId ? "ok" : "expired"}`);
}
