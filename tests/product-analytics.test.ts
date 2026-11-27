import { expect, test } from "vitest";
import { isPrivatePage, scrubUrl } from "@/lib/product-analytics";

test("scrubUrl drops tokens and keeps campaign tags", () => {
  expect(scrubUrl("https://www.unprompters.com/reset-password?token=abc123")).toBe("https://www.unprompters.com/reset-password");
  expect(scrubUrl("https://www.unprompters.com/explore?utm_source=ig&ref=x#top")).toBe("https://www.unprompters.com/explore?utm_source=ig");
  expect(scrubUrl("https://www.unprompters.com/explore")).toBe("https://www.unprompters.com/explore");
  expect(scrubUrl(null)).toBe(null);
});

test("isPrivatePage covers chat, dashboard, admin and sign-in pages only", () => {
  for (const path of ["/chat", "/chat/someone", "/dashboard", "/dashboard/profile", "/admin/merch", "/login", "/signup", "/reset-password"]) {
    expect(isPrivatePage(path)).toBe(true);
  }
  for (const path of ["/", "/explore", "/u/chatty", "/journal/admin-tips", "/listing/dashboard-art"]) {
    expect(isPrivatePage(path)).toBe(false);
  }
});
