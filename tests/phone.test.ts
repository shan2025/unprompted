import { describe, expect, it } from "vitest";
import { formatPhone, looksLikePhone, maskPhone, parsePhone } from "@/lib/phone";

describe("looksLikePhone", () => {
  it("tells numbers from emails as people type them in the log-in box", () => {
    expect(looksLikePhone("98765 43210")).toBe(true);
    expect(looksLikePhone("+1 (415) 555-0100")).toBe(true);
    expect(looksLikePhone("mara@example.com")).toBe(false);
    expect(looksLikePhone("mara")).toBe(false);
    expect(looksLikePhone("987")).toBe(false); // too short to decide yet
  });
});

describe("parsePhone", () => {
  it("adds India's code to a ten-digit mobile number", () => {
    expect(parsePhone("98765 43210")).toBe("+919876543210");
    expect(parsePhone("098765-43210")).toBe("+919876543210");
  });

  it("keeps international numbers", () => {
    expect(parsePhone("+91 98765 43210")).toBe("+919876543210");
    expect(parsePhone("+1 (415) 555-0100")).toBe("+14155550100");
    expect(parsePhone("0044 7700 900123")).toBe("+447700900123");
  });

  it("rejects things that can't be numbers", () => {
    expect(parsePhone("")).toBeNull();
    expect(parsePhone("12345")).toBeNull();
    expect(parsePhone("call me")).toBeNull();
    expect(parsePhone("+91 12345 67890")).toBeNull(); // Indian mobiles start 6–9
    expect(parsePhone("+1234567890123456")).toBeNull(); // too long
  });
});

describe("formatPhone and maskPhone", () => {
  it("groups Indian numbers and hides most digits", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(maskPhone("+919876543210")).toBe("•••• 3210");
  });
});
