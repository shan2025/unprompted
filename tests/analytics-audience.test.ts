import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ga4RunsInThisEnvironment, ga4TracksVisitor } from "@/lib/analytics-audience";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.stubEnv("COMPANY_OWNER_USER_ID", "17");
  vi.stubEnv("GA4_EXCLUDED_ACCOUNTS", " TEAM@example.test , 42 ");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
});

afterEach(() => vi.unstubAllEnvs());

test("counts public visitors and members outside the team", () => {
  expect(ga4TracksVisitor(null)).toBe(true);
  expect(ga4TracksVisitor({ id: 18, email: "member@example.test", role: "member" })).toBe(true);
  expect(ga4TracksVisitor({ id: 24, email: null, role: "member" })).toBe(true);
});

test("excludes admins, the company owner, and listed team accounts", () => {
  expect(ga4TracksVisitor({ id: 1, email: null, role: "admin" })).toBe(false);
  expect(ga4TracksVisitor({ id: 17, email: null, role: "member" })).toBe(false);
  expect(ga4TracksVisitor({ id: 18, email: "team@example.test", role: "member" })).toBe(false);
  expect(ga4TracksVisitor({ id: 42, email: null, role: "member" })).toBe(false);
});

test("runs in production and skips preview and development", () => {
  expect(ga4RunsInThisEnvironment()).toBe(true);
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(ga4RunsInThisEnvironment()).toBe(false);
  vi.stubEnv("VERCEL_ENV", undefined);
  expect(ga4RunsInThisEnvironment()).toBe(true);
  vi.stubEnv("NODE_ENV", "development");
  expect(ga4RunsInThisEnvironment()).toBe(false);
});
