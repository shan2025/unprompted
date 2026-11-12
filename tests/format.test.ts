import { describe, expect, it } from "vitest";
import { formatMoney, formatPrice, safeNext } from "@/lib/format";

describe("formatPrice", () => {
  it("shows each listing in its own currency, unconverted", () => {
    expect(formatPrice(50000, "INR")).toBe("₹500");
    expect(formatPrice(2500, "USD")).toBe("$25");
    expect(formatPrice(1999, "EUR")).toBe("€19.99");
    expect(formatPrice(1200, "GBP")).toBe("£12");
  });

  it("reads zero as Free in any currency", () => {
    expect(formatPrice(0, "INR")).toBe("Free");
  });

  it("treats listings from before currencies existed, or a bad code, as dollars", () => {
    expect(formatPrice(2500)).toBe("$25");
    expect(formatMoney(2500, "XYZ")).toBe("$25");
  });
});

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("/journal/a-post#comments")).toBe("/journal/a-post#comments");
    expect(safeNext("/explore?category=art&maxAi=5")).toBe("/explore?category=art&maxAi=5");
  });

  it.each(["//evil.com", "/\\evil.com", "\\\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "javascript:alert(1)"])(
    "refuses %j",
    (value) => {
      expect(safeNext(value, "/fallback")).toBe("/fallback");
    },
  );

  it("falls back on anything that isn't a string", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined, "")).toBe("");
  });
});
