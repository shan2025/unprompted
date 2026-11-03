import { describe, expect, it } from "vitest";
import { parsePaymentLink, paymentProvider, upiId } from "@/lib/payment-link";

describe("parsePaymentLink", () => {
  it.each([
    "https://rzp.io/l/abc",
    "https://razorpay.me/@maker",
    "https://pages.razorpay.com/maker",
    "https://www.paypal.com/ncp/payment/ABC",
    "https://paypal.me/maker/25",
    "https://buy.stripe.com/abc123",
    "upi://pay?pa=maker@okhdfc&am=500",
  ])("accepts %s", (link) => {
    expect(parsePaymentLink(link)).toBe(link);
  });

  it.each([
    "http://rzp.io/l/abc",
    "https://evil.com/rzp.io",
    "https://rzp.io.evil.com/l/abc",
    "https://notrzp.io/l/abc",
    "https://rzp.io@evil.com/l/abc",
    "https://stripe.com.evil.com",
    "https://evil.com#paypal.com",
    "javascript:alert(1)",
    "data:text/html,hi",
    "upi://pay",
    "upi://evil?pa=x",
    "not a link",
    "",
    `https://rzp.io/${"a".repeat(500)}`,
  ])("refuses %s", (link) => {
    expect(parsePaymentLink(link)).toBeNull();
  });

  it("trims spaces", () => {
    expect(parsePaymentLink("  https://rzp.io/l/abc ")).toBe("https://rzp.io/l/abc");
  });
});

describe("payment link details", () => {
  it("names where a link goes", () => {
    expect(paymentProvider("https://www.paypal.com/x")).toBe("paypal.com");
    expect(paymentProvider("upi://pay?pa=maker@okhdfc")).toBe("UPI");
  });

  it("finds the UPI ID", () => {
    expect(upiId("upi://pay?pa=maker@okhdfc&am=500")).toBe("maker@okhdfc");
    expect(upiId("https://rzp.io/l/abc")).toBeNull();
  });
});
