import { describe, expect, it } from "vitest";
import { browseHref, browseQueryHref, categoryHeading, singleCategory } from "@/lib/browse";

describe("browseHref", () => {
  it("gives one craft its own page", () => {
    expect(browseHref("explore", "crafts")).toBe("/explore/crafts");
    expect(browseHref("marketplace", "music")).toBe("/marketplace/music");
  });
  it("falls back to the page itself", () => {
    expect(browseHref("explore", null)).toBe("/explore");
  });
});

describe("browseQueryHref", () => {
  it("puts one craft in the path and keeps the other filters", () => {
    expect(browseQueryHref("explore", ["crafts"], new URLSearchParams("sort=least-ai&maxAi=5"))).toBe("/explore/crafts?sort=least-ai&maxAi=5");
  });
  it("keeps several crafts as a filter", () => {
    expect(browseQueryHref("marketplace", ["art", "design"], new URLSearchParams())).toBe("/marketplace?category=art%2Cdesign");
  });
  it("drops a stale category filter", () => {
    expect(browseQueryHref("explore", [], new URLSearchParams("category=art&q=pots"))).toBe("/explore?q=pots");
  });
});

describe("singleCategory", () => {
  it("names one known craft", () => {
    expect(singleCategory("crafts")).toBe("crafts");
  });
  it("ignores several, unknown or missing", () => {
    expect(singleCategory("art,design")).toBeNull();
    expect(singleCategory("pottery")).toBeNull();
    expect(singleCategory(undefined)).toBeNull();
  });
});

describe("categoryHeading", () => {
  it("reads naturally on both pages", () => {
    expect(categoryHeading("explore", "crafts").title).toBe("Handicrafts made by people");
    expect(categoryHeading("marketplace", "music").title).toBe("Buy music and audio made by people");
  });
  it("doesn't repeat itself for other work", () => {
    expect(categoryHeading("explore", "other").intro).toBe("Work that fits none of the other crafts, made by people. Each piece shows how much AI was involved.");
  });
});
