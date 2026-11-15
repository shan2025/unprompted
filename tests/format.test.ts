import { describe, expect, it } from "vitest";
import { formatMoney, formatPrice, safeNext, snippet } from "@/lib/format";

describe("snippet", () => {
  it("keeps short text whole, on one line", () => {
    expect(snippet("  A poem\n\nabout   rain. ")).toBe("A poem about rain.");
  });

  it("cuts long text at a word and marks the cut", () => {
    const text = "The river ran slow that summer, and we walked beside it every evening until the light went.";
    const out = snippet(text, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out).toBe("The river ran slow that summer, and we…");
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(snippet("One, two, three, four, five, six", 20)).toBe("One, two, three…");
  });

  it("cuts inside a single very long word", () => {
    expect(snippet("a".repeat(50), 10)).toBe(`${"a".repeat(9)}…`);
  });
});

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
