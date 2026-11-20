import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { settleCashfreeOrder, type Settled } from "@/lib/checkout";
import { clientIp, withinLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/report-error";

/**
 * Cashfree sends the buyer back here after checkout, whether they paid or not.
 * We ask Cashfree how the order went (never trusting the address), then show the listing.
 */
export async function GET(request: NextRequest) {
  if (!(await withinLimit(`checkout-return:ip:${await clientIp()}`, 60, 60 * 60))) redirect("/marketplace");
  const orderId = request.nextUrl.searchParams.get("order_id") ?? "";
  if (!/^[\w-]{3,45}$/.test(orderId)) redirect("/marketplace");

  let settled: Settled | null = null;
  try {
    settled = await settleCashfreeOrder(orderId);
  } catch (error) {
    await reportError({ where: "cashfree return", message: String(error), path: request.nextUrl.pathname });
  }
  if (!settled) redirect("/marketplace");
  const query = settled.outcome === "paid" ? "purchased=1" : `payment=${settled.outcome}`;
  redirect(`/listing/${settled.slug}?${query}`);
}
