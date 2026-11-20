import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cashfree Payment Gateway (https://www.cashfree.com/docs/api-reference/payments).
// We create an order on our server, the buyer pays on Cashfree's checkout, and
// we only trust what Cashfree's API reports back. The return page and webhook
// just ask it again (src/lib/checkout.ts).

export type CashfreeMode = "sandbox" | "production";

function config() {
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secret = process.env.CASHFREE_SECRET_KEY?.trim();
  if (!appId || !secret) return null;
  const mode: CashfreeMode = process.env.CASHFREE_ENV?.trim() === "production" ? "production" : "sandbox";
  return {
    appId,
    secret,
    mode,
    base: mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
    version: process.env.CASHFREE_API_VERSION?.trim() || "2025-01-01",
  };
}

/** Whether keys are set. Without them, listings fall back to the seller's payment link. */
export function cashfreeEnabled() {
  return config() !== null;
}

export function cashfreeMode(): CashfreeMode {
  return config()?.mode ?? "sandbox";
}

export class CashfreeError extends Error {}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const c = config();
  if (!c) throw new CashfreeError("Cashfree isn't configured.");
  const response = await fetch(`${c.base}${path}`, {
    method,
    headers: {
      "x-client-id": c.appId,
      "x-client-secret": c.secret,
      "x-api-version": c.version,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data ? String(data.message) : response.statusText;
    throw new CashfreeError(`Cashfree ${method} ${path} failed (${response.status}): ${message}`);
  }
  return data as T;
}

export type CashfreeOrder = {
  order_id: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";
  order_amount: number;
  order_currency: string;
  payment_session_id?: string;
};

/**
 * Cashfree wants a ten-digit number for India and "+" with the country code
 * otherwise. Our phones are stored in E.164 ("+919876543210").
 */
export function cashfreePhone(e164: string) {
  const india = e164.match(/^\+91(\d{10})$/);
  return india ? india[1] : e164;
}

export async function createCashfreeOrder(input: {
  orderId: string;
  amountCents: number;
  currency: string;
  customer: { id: number; name: string; email: string | null; phone: string };
  returnUrl: string;
  notifyUrl: string | null;
  note: string;
  expiresAt: Date;
}) {
  return call<CashfreeOrder & { payment_session_id: string }>("POST", "/orders", {
    order_id: input.orderId,
    order_amount: input.amountCents / 100,
    order_currency: input.currency,
    customer_details: {
      // Letters and digits only.
      customer_id: `user${input.customer.id}`,
      customer_name: input.customer.name.slice(0, 100),
      ...(input.customer.email ? { customer_email: input.customer.email } : {}),
      customer_phone: cashfreePhone(input.customer.phone),
    },
    order_meta: {
      return_url: input.returnUrl,
      // Cashfree only posts webhooks to https addresses, so local development skips it.
      ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}),
    },
    order_note: input.note.slice(0, 200),
    order_expiry_time: input.expiresAt.toISOString(),
  });
}

export async function fetchCashfreeOrder(orderId: string) {
  return call<CashfreeOrder>("GET", `/orders/${encodeURIComponent(orderId)}`);
}

type CashfreePayment = { payment_status: string; payment_time?: string | null };

/**
 * An order stays ACTIVE after a failed attempt, so the buyer can retry until it
 * expires. The latest attempt says whether they're still paying or gave up.
 */
export async function latestCashfreeAttempt(orderId: string) {
  const attempts = await call<CashfreePayment[]>("GET", `/orders/${encodeURIComponent(orderId)}/payments`);
  if (!Array.isArray(attempts) || !attempts.length) return null;
  return [...attempts].sort((a, b) => Date.parse(b.payment_time ?? "") - Date.parse(a.payment_time ?? ""))[0].payment_status;
}

/**
 * Checks a webhook really came from Cashfree: base64 HMAC-SHA256 of the
 * timestamp followed by the raw body, keyed with our secret.
 */
export function verifyCashfreeWebhook(rawBody: string, timestamp: string | null, signature: string | null) {
  const c = config();
  if (!c || !timestamp || !signature) return false;
  const expected = createHmac("sha256", c.secret).update(timestamp + rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
