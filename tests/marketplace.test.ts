import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { MarketplaceResults, type Params } from "@/components/BrowseResults";

const viewer = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: viewer }));
vi.mock("@/lib/data", () => ({ searchListings: async () => [], usedCategories: async () => [] }));
vi.mock("@/lib/feed", () => ({ searchFeed: vi.fn() }));
vi.mock("@/components/ExploreView", () => ({
  ExploreView: ({ actions, children }: { actions: ReactNode; children: ReactNode }) => [actions, children],
}));

async function marketplace(params: Params = {}) {
  return renderToStaticMarkup(await MarketplaceResults({ searchParams: Promise.resolve(params) }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  viewer.mockReset();
});

it("keeps the company shop available on an empty, sorted marketplace", async () => {
  vi.stubEnv("MERCH_STORE_URL", "https://shop.example.test");
  const html = await marketplace({ sort: "price-low" });
  expect(html).toContain("No creator listings yet.");
  expect(html).toContain('href="https://shop.example.test/"');
  expect(html).toContain("List your work");
  expect(html).not.toContain("Clear filters");
  expect(html).not.toContain("/admin/merch");
});

it("links the designated owner to merch analytics without an external shop", async () => {
  vi.stubEnv("MERCH_STORE_URL", "");
  vi.stubEnv("COMPANY_OWNER_USER_ID", "17");
  viewer.mockResolvedValue({ id: 17, role: "member" });
  const html = await marketplace();
  expect(html).toContain('href="/admin/merch"');
  expect(html).toContain("My merch analytics");
  expect(html).not.toContain("Shop Unprompters merch");
});

it.each(["17", ""])("hides management from another admin with owner setting %j", async owner => {
  vi.stubEnv("COMPANY_OWNER_USER_ID", owner);
  vi.stubEnv("MERCH_STORE_URL", "https://shop.example.test");
  viewer.mockResolvedValue({ id: 22, role: "admin" });
  const html = await marketplace();
  expect(html).not.toContain("/admin/merch");
  expect(html).toContain("Shop Unprompters merch");
});

it("offers to reset a real filter and keeps staff tools private", async () => {
  viewer.mockResolvedValue({ role: "member" });
  const html = await marketplace({ verified: "1" });
  expect(html).toContain("No creator listings match your filters.");
  expect(html).toContain("Clear filters");
  expect(html).not.toContain("/admin/merch");
});
