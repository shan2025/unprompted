import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cashfreeEnabled, cashfreePhone, verifyCashfreeWebhook } = await import("@/lib/cashfree");

describe("Cashfree", () => {
  beforeEach(() => {
    vi.stubEnv("CASHFREE_APP_ID", "TEST_APP");
    vi.stubEnv("CASHFREE_SECRET_KEY", "test-secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is off without keys", () => {
    vi.stubEnv("CASHFREE_SECRET_KEY", "");
    expect(cashfreeEnabled()).toBe(false);
  });

  it("sends Indian numbers as ten digits and others with their country code", () => {
    expect(cashfreePhone("+919876543210")).toBe("9876543210");
    expect(cashfreePhone("+14155550100")).toBe("+14155550100");
  });

  it("accepts only webhooks signed with our secret over the timestamp and raw body", () => {
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id: "unp-1" } } });
    const timestamp = "1763630000000";
    const signature = createHmac("sha256", "test-secret").update(timestamp + body).digest("base64");
    expect(verifyCashfreeWebhook(body, timestamp, signature)).toBe(true);
    expect(verifyCashfreeWebhook(body.replace("unp-1", "unp-2"), timestamp, signature)).toBe(false);
    expect(verifyCashfreeWebhook(body, "1763630000001", signature)).toBe(false);
    expect(verifyCashfreeWebhook(body, timestamp, createHmac("sha256", "other").update(timestamp + body).digest("base64"))).toBe(false);
    expect(verifyCashfreeWebhook(body, null, signature)).toBe(false);
    expect(verifyCashfreeWebhook(body, timestamp, "short")).toBe(false);
  });
});
