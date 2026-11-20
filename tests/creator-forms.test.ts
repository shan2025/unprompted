import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { PostForm } from "@/components/PostForm";
import { ProductGallery } from "@/components/ProductGallery";
import { SellForm } from "@/components/SellForm";

const draft = vi.hoisted((): Record<string, string> => ({}));
afterEach(() => { for (const key of Object.keys(draft)) delete draft[key]; });
vi.mock("@/components/DraftWorkspace", () => ({
  useDraftWorkspace: () => ({
    initial: { fields: [], files: [] },
    value: (key: string) => draft[key],
  }),
}));
vi.mock("@/app/actions/listings", () => ({}));
vi.mock("@/app/actions/posts", () => ({}));

it.each(["", "0", "₹1,500"])("restores payment fields according to the saved price %j", price => {
  draft.price = price;
  const html = renderToStaticMarkup(createElement(SellForm, {}));
  const payment = html.match(/<input[^>]+id="paymentUrl"[^>]*>/)?.[0];
  expect(payment).toBeDefined();
  expect(payment!.includes("disabled")).toBe(price !== "₹1,500");
  expect(html).toMatch(/id="title"[\s\S]*id="cover"[\s\S]*id="category"/);
  expect(html).toContain("Caps &amp; hats");
  expect(html).toContain("Product photos");
});

it("offers an early image upload when showcasing work and omits the selling fields", () => {
  const html = renderToStaticMarkup(createElement(PostForm, {}));
  expect(html).toMatch(/id="title"[\s\S]*id="cover"[\s\S]*id="body"/);
  expect(html).not.toMatch(/name="(?:paymentUrl|price|license)"/);
  expect(html).not.toContain("Caps &amp; hats");
});

it("shows buyers the first photo at full size and the thumbnails in seller order", () => {
  const files = ["front.webp", "back.webp", "seam.webp"];
  const html = renderToStaticMarkup(createElement(ProductGallery, { title: "Cotton tee", files }));
  expect(html).toContain("Cotton tee, photo 1 of 3");
  expect([...html.matchAll(/<img[^>]* src="([^"]+)"/g)].map(match => match[1])).toEqual(
    [files[0], ...files].map(file => "/api/files/" + file),
  );
});

it("keeps a new physical listing focused on product and sale fields", () => {
  draft.category = "tshirt";
  const html = renderToStaticMarkup(createElement(SellForm, {}));
  expect(html).toContain("Product photos");
  expect(html).toMatch(/<select[^>]*id="license"[^>]*disabled/);
  expect(html).not.toMatch(/<details[^>]* open|Cover pattern|See your number before anyone else does/);
  expect(html).toContain('name="disclosure_mode"');
  expect(html).toMatch(/<fieldset[^>]*hidden[^>]*disabled[^>]*><legend[^>]*>AI use by stage/);
  expect(html).not.toMatch(/type="hidden" name="disclosure_\w+" value="none"/);
});

it("restores an explicit no-AI choice as four scored answers", () => {
  draft.disclosure_mode = "none";
  const html = renderToStaticMarkup(createElement(SellForm, {}));
  expect(html.match(/type="hidden" name="disclosure_\w+" value="none"/g)).toHaveLength(4);
});

it("shows stage-specific answers from older drafts", () => {
  Object.assign(draft, { disclosure_creation: "light", disclosure_assets: "none" });
  const html = renderToStaticMarkup(createElement(SellForm, {}));
  expect(html).toMatch(/<option value="stages" selected/);
  expect(html).toMatch(/name="disclosure_creation"[\s\S]*?<option value="light" selected/);
});

it("opens saved optional details on restore and preserves a saved cover choice", () => {
  Object.assign(draft, { category: "cap", locked: "Pick up on Friday.", aiNotes: "Drawn in pencil.", cover_theme: "clay" });
  const html = renderToStaticMarkup(createElement(SellForm, {}));
  expect(html.match(/<details[^>]* open/g)).toHaveLength(2);
  expect(html).toContain("Pick up on Friday.");
  expect(html).toContain("Drawn in pencil.");
  expect(html).toMatch(/type="hidden" name="cover_theme" value="clay"/);
});
