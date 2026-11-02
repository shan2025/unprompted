import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/format";

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
