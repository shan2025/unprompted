import { verifyCashfreeWebhook } from "@/lib/cashfree";
import { settleCashfreeOrder } from "@/lib/checkout";
import { reportError } from "@/lib/report-error";

/**
 * Cashfree's server tells us about payments here, so an order still completes
 * when the buyer closes the tab before coming back. The body only tells us which
 * order to look at: settleCashfreeOrder asks Cashfree's API for the real status.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyCashfreeWebhook(raw, request.headers.get("x-webhook-timestamp"), request.headers.get("x-webhook-signature"))) {
    return new Response("Bad signature", { status: 401 });
  }

  let orderId: unknown;
  try {
    orderId = (JSON.parse(raw) as { data?: { order?: { order_id?: unknown } } }).data?.order?.order_id;
  } catch {
    return new Response("Bad body", { status: 400 });
  }
  // Test pings and events without an order need nothing from us.
  if (typeof orderId !== "string") return new Response("ok");

  try {
    await settleCashfreeOrder(orderId);
  } catch (error) {
    await reportError({ where: "cashfree webhook", message: String(error), path: "/api/payments/cashfree/webhook" });
    // Cashfree retries failed deliveries.
    return new Response("Try again", { status: 500 });
  }
  return new Response("ok");
}
