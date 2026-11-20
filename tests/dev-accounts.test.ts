import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { devAccountsEnabled } from "@/lib/dev-accounts";

const incoming = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: incoming }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("DEV_ACCOUNT_PICKER", "1");
  vi.stubEnv("DATABASE_URL", "postgres://localhost/test");
  incoming.mockResolvedValue(new Headers({ host: "127.0.0.1:3135" }));
});
afterEach(() => vi.unstubAllEnvs());

it("enables the picker for the opted-in local app", async () => {
  expect(await devAccountsEnabled()).toBe(true);
});

it.each([
  ["NODE_ENV", "production"],
  ["VERCEL", "1"],
  ["DEV_ACCOUNT_PICKER", ""],
  ["DATABASE_URL", "postgres://db.example.test/test"],
])("disables local sessions when %s is %j", async (name, value) => {
  vi.stubEnv(name, value);
  expect(await devAccountsEnabled()).toBe(false);
});

it("requires a loopback host including when a proxy forwards the request", async () => {
  incoming.mockResolvedValue(new Headers({ host: "preview.example.test" }));
  expect(await devAccountsEnabled()).toBe(false);
  incoming.mockResolvedValue(new Headers({ host: "localhost", "x-forwarded-host": "preview.example.test" }));
  expect(await devAccountsEnabled()).toBe(false);
});
