import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { count, desc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import sharp from "sharp";
import { draftFormData } from "@/lib/drafts";

// Run only against an explicitly supplied disposable localhost database.
const configured = process.env.TEST_DATABASE_URL;
if (configured) {
  const url = new URL(configured);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/unprompted_publishing_test_\d+$/.test(url.pathname)) throw new Error("Use a disposable local unprompted_publishing_test_<timestamp> database.");
}
const session = vi.hoisted(() => ({ id: 0, role: "member" as "member" | "admin" }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => ({ ...session, verified: true, email: "test@example.test", handle: `tester${session.id}`, name: "Test creator" }),
  requireAdmin: async () => { if (session.role !== "admin") throw new Error("Not an admin"); return session; },
}));
vi.mock("@/lib/db", async () => {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { default: postgres } = await import("postgres");
  const schema = await import("@/lib/db/schema");
  const client = process.env.TEST_DATABASE_URL ? postgres(process.env.TEST_DATABASE_URL, { max: 4, onnotice: () => {} }) : null;
  return { db: client ? drizzle(client, { schema }) : null, schema, closeDb: async () => { await client?.end(); } };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/indexnow", () => ({ announce: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: async () => true, escapeHtml: (s: string) => s }));

import { db, schema, closeDb } from "@/lib/db";
import { openWorkDraft, saveWorkDraft } from "@/app/actions/drafts";
import { createPost, updatePost } from "@/app/actions/posts";
import { createListing, updateListing, withdrawListing } from "@/app/actions/listings";
import { reviewProcessEvidence } from "@/app/actions/admin";
import { getMerchOrders, getMerchSales, getOrderStatus, salesCount, searchListings } from "@/lib/data";
import { STAGES } from "@/lib/scoring";
import { dispatchShipment } from "@/lib/fulfillment";
import { settleCashfreeOrder } from "@/lib/checkout";
import { prepareShipment, fulfillmentVariants } from "@/lib/qikink";

let creator = 0, other = 0;
function form(kind: "post" | "listing" = "post") {
  const fd = new FormData();
  fd.set("title", "My ink drawing"); fd.set("category", "art");
  fd.set(kind === "post" ? "body" : "preview", "I drew this in my notebook.");
  fd.set("summary", "An ink drawing from my notebook."); fd.set("locked", "Original buyer delivery");
  fd.set("price", "0"); fd.set("currency", "INR"); fd.set("license", "personal");
  for (const stage of STAGES) fd.set(`disclosure_${stage}`, "none");
  fd.set("attest", "on"); return fd;
}

describe.skipIf(!configured)("publishing against isolated PostgreSQL", () => {
  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle" });
    const members = await db.insert(schema.users).values([
      { email: "creator@publishing.test", passwordHash: "test-only", name: "Creator", handle: "publishing_creator" },
      { email: "other@publishing.test", passwordHash: "test-only", name: "Other", handle: "publishing_other" },
    ]).onConflictDoNothing().returning();
    if (members.length) { creator = members[0].id; other = members[1].id; }
    else { const rows = await db.select().from(schema.users); creator = rows.find((u) => u.handle === "publishing_creator")!.id; other = rows.find((u) => u.handle === "publishing_other")!.id; }
  }, 30_000);
  beforeEach(() => { session.id = creator; session.role = "member"; });
  afterAll(async () => { await closeDb(); });

  it("submits a paid merch order once and holds ambiguous submissions for review", async () => {
    await expect(createListing(null, form("listing"))).rejects.toThrow("REDIRECT:");
    const [listing] = await db.select().from(schema.listings).orderBy(desc(schema.listings.id)).limit(1);
    try {
      vi.stubEnv("COMPANY_OWNER_USER_ID", String(creator));
      vi.stubEnv("QIKINK_CATALOG", JSON.stringify({ [listing.slug]: { "Blue / M": "TEE-BLU-M" } }));
      vi.stubEnv("QIKINK_ENV", "sandbox");
      vi.stubEnv("CASHFREE_ENV", "sandbox");
      vi.stubEnv("CASHFREE_APP_ID", "test");
      vi.stubEnv("CASHFREE_SECRET_KEY", "test");
      vi.stubEnv("QIKINK_CLIENT_ID", "test");
      vi.stubEnv("QIKINK_CLIENT_SECRET", "test");
      const merch = { ...listing, productType: "tshirt" };
      expect(fulfillmentVariants({ ...merch, creatorId: other }).size).toBe(0);
      expect(fulfillmentVariants({ ...merch, productType: "writing" }).size).toBe(0);
      const variants = fulfillmentVariants(merch);
      const fd = new FormData();
      for (const [key, value] of Object.entries({ variant: "Blue / M", first_name: "Test", last_name: "Buyer", address1: "Test street", city: "Mumbai", province: "Maharashtra", zip: "400001" })) fd.set(key, value);
      const shipment = prepareShipment(variants, fd, "+919876543210", "buyer@example.test", "INR");
      if (typeof shipment === "string") throw Error(shipment);
      fd.set("variant", "unlisted");
      expect(typeof prepareShipment(variants, fd, "+919876543210", "buyer@example.test", "INR")).toBe("string");
      const [p, ambiguous] = await db.insert(schema.payments).values(["test-qikink-1", "test-qikink-2"].map(providerOrderId => ({
        provider: "cashfree" as const, providerOrderId, listingId: listing.id, buyerId: other, currency: "INR", amountCents: 79900, shipment, fulfillment: "waiting" as const,
      }))).returning();
      const requests: Record<string, unknown>[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
        if (url === `https://sandbox.cashfree.com/pg/orders/${p.providerOrderId}`) {
          return Response.json({ order_status: "PAID", order_amount: 799, order_currency: "INR" });
        }
        if (url === "https://sandbox.qikink.com/api/token") return Response.json({ Accesstoken: "test-token" });
        expect(url).toBe("https://sandbox.qikink.com/api/order/create");
        const payload = JSON.parse(String(init.body));
        requests.push(payload);
        if (payload.order_number === `UNP${ambiguous.id}`) throw Error("Connection lost");
        return Response.json({ order_id: 123 });
      }));
      await dispatchShipment(p.id);
      expect(requests).toHaveLength(0);
      await Promise.all([settleCashfreeOrder(p.providerOrderId), settleCashfreeOrder(p.providerOrderId)]);
      await settleCashfreeOrder(p.providerOrderId);
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({ order_number: `UNP${p.id}`, gateway: "Prepaid", total_order_value: "799.00", line_items: [{ sku: "TEE-BLU-M", quantity: "1" }] });
      expect((await db.select().from(schema.payments).where(eq(schema.payments.id, p.id)))[0]).toMatchObject({ fulfillment: "sent", shipment: null });
      await db.update(schema.payments).set({ status: "paid" }).where(eq(schema.payments.id, ambiguous.id));
      await dispatchShipment(ambiguous.id);
      await dispatchShipment(ambiguous.id);
      expect(requests).toHaveLength(2);
      expect((await db.select().from(schema.payments).where(eq(schema.payments.id, ambiguous.id)))[0].fulfillment).toBe("review");
    } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
  });

  it("lets a buyer order the same merch again and counts every paid order", async () => {
    const fd = form("listing");
    fd.set("category", "tshirt"); fd.set("title", "Repeat T-shirt");
    await expect(createListing(null, fd)).rejects.toThrow("REDIRECT:");
    const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.title, "Repeat T-shirt"));
    try {
      vi.stubEnv("QIKINK_ENV", "sandbox");
      vi.stubEnv("CASHFREE_ENV", "sandbox");
      vi.stubEnv("CASHFREE_APP_ID", "test");
      vi.stubEnv("CASHFREE_SECRET_KEY", "test");
      vi.stubEnv("QIKINK_CLIENT_ID", "test");
      vi.stubEnv("QIKINK_CLIENT_SECRET", "test");
      const shipment = {
        mode: "sandbox" as const, sku: "TEE-BLK-L", label: "Black / L",
        address: { first_name: "Test", last_name: "Buyer", address1: "Test street", city: "Pune", province: "Maharashtra", zip: "411001", phone: "9876543210", email: "buyer@example.test", country_code: "IN" as const },
      };
      // The buyer's first T-shirt, already paid and recorded as their order.
      await db.insert(schema.orders).values({ listingId: listing.id, buyerId: other, status: "paid", amountCents: 79900, currency: "INR", paymentReference: "test-repeat-first" });
      const [again, double] = await db.insert(schema.payments).values([
        { provider: "cashfree" as const, providerOrderId: "test-repeat-again", listingId: listing.id, buyerId: other, currency: "INR", amountCents: 79900, shipment, fulfillment: "waiting" as const },
        // Without a shipment, a second payment from an owner is a double payment.
        { provider: "cashfree" as const, providerOrderId: "test-repeat-double", listingId: listing.id, buyerId: other, currency: "INR", amountCents: 79900 },
      ]).returning();
      const created: Record<string, unknown>[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
        if (url.startsWith("https://sandbox.cashfree.com/pg/orders/")) return Response.json({ order_status: "PAID", order_amount: 799, order_currency: "INR" });
        if (url === "https://sandbox.qikink.com/api/token") return Response.json({ Accesstoken: "test-token" });
        created.push(JSON.parse(String(init.body)));
        return Response.json({ order_id: 456 });
      }));
      expect(await settleCashfreeOrder(again.providerOrderId)).toMatchObject({ outcome: "paid" });
      expect(await settleCashfreeOrder(double.providerOrderId)).toMatchObject({ outcome: "refund_due" });
      expect(created).toEqual([expect.objectContaining({ order_number: `UNP${again.id}`, line_items: [expect.objectContaining({ sku: "TEE-BLK-L" })] })]);
      const [order] = await db.select().from(schema.orders).where(eq(schema.orders.listingId, listing.id));
      expect(order).toMatchObject({ status: "paid", paymentReference: "test-repeat-first" });
      expect((await getMerchOrders(listing.id, other)).map(o => [o.id, o.status, o.fulfillment])).toEqual([
        [double.id, "refund_due", null],
        [again.id, "paid", "sent"],
      ]);
      expect(await salesCount(listing.id)).toBe(2);
      const report = await getMerchSales(creator);
      expect(report.products.find(p => p.title === "Repeat T-shirt")).toMatchObject({ confirmed: 2, revenue: new Map([["INR", 159800]]) });
    } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
  });

  it("counts only confirmed sales of the owner's merchandise in each order's currency", async () => {
    const [owner, buyerA, buyerB, buyerC, buyerD] = await db.insert(schema.users).values(
      ["owner", "buyer_a", "buyer_b", "buyer_c", "buyer_d"].map(name => ({
        handle: `merch_${name}`, name, email: `merch_${name}@publishing.test`, passwordHash: "test-only",
      })),
    ).returning();
    async function publish(seller: number, category: string, title: string) {
      session.id = seller;
      const fd = form("listing");
      fd.set("category", category);
      fd.set("title", title);
      await expect(createListing(null, fd)).rejects.toThrow("REDIRECT:");
      const [listing] = await db.select().from(schema.listings).where(eq(schema.listings.title, title));
      return listing.id;
    }
    const tee = await publish(owner.id, "tshirt", "Company T-shirt");
    const cap = await publish(owner.id, "cap", "Company cap");
    await publish(owner.id, "homeware", "Unsold mug");
    const book = await publish(owner.id, "writing", "Company book");
    const outside = await publish(other, "tshirt", "Another seller's T-shirt");
    const demo = await publish(owner.id, "merch", "Company sample");
    await db.update(schema.listings).set({ isDemo: true }).where(eq(schema.listings.id, demo));
    await db.insert(schema.orders).values([
      { listingId: tee, buyerId: buyerA.id, status: "paid", amountCents: 60000, currency: "INR" },
      { listingId: tee, buyerId: buyerB.id, status: "paid", amountCents: 900, currency: "USD" },
      { listingId: tee, buyerId: buyerC.id, status: "pending", amountCents: 70000, currency: "INR" },
      { listingId: tee, buyerId: buyerD.id, status: "refunded", amountCents: 50000 },
      { listingId: cap, buyerId: buyerA.id, status: "paid", amountCents: 30000, currency: "INR" },
      { listingId: cap, buyerId: buyerB.id, status: "declined", amountCents: 3000 },
      { listingId: cap, buyerId: buyerC.id, status: "demo", amountCents: 3000 },
      { listingId: cap, buyerId: buyerD.id, status: "paid", amountCents: 0 },
      { listingId: book, buyerId: buyerA.id, status: "paid", amountCents: 5000 },
      { listingId: outside, buyerId: buyerA.id, status: "paid", amountCents: 5000 },
      { listingId: demo, buyerId: buyerA.id, status: "paid", amountCents: 5000 },
    ]);

    const report = await getMerchSales(owner.id);
    expect(report.confirmed).toBe(3);
    expect(report.pending).toBe(1);
    expect(Object.fromEntries(report.revenue)).toEqual({ INR: 90000, USD: 900 });
    expect(report.products.map(p => [p.title, p.confirmed, Object.fromEntries(p.revenue)])).toEqual([
      ["Company T-shirt", 2, { INR: 60000, USD: 900 }],
      ["Company cap", 1, { INR: 30000 }],
      ["Unsold mug", 0, {}],
    ]);
  });

  it("keeps draft content and files private to its owner and rejects stale saves", async () => {
    const draft = await openWorkDraft("post", "");
    if ("error" in draft) throw new Error(draft.error);
    const [before] = await db.select({ count: count() }).from(schema.uploads);
    const fd = form(); fd.set("evidence_file_0", new File(["%PDF-1.7 private draft"], "draft.pdf"));
    session.id = other;
    expect(await openWorkDraft("post", "", draft.id)).toHaveProperty("error");
    expect(await saveWorkDraft(draft.id, 0, fd)).toHaveProperty("error");
    session.id = creator;
    const results = await Promise.all([saveWorkDraft(draft.id, 0, fd), saveWorkDraft(draft.id, 0, fd)]);
    expect(results.filter((r) => "version" in r)).toHaveLength(1);
    expect(results.filter((r) => "error" in r)).toHaveLength(1);
    const loaded = await openWorkDraft("post", "", draft.id);
    expect(loaded).toMatchObject({ version: 1 });
    if ("error" in loaded) throw new Error(loaded.error);
    expect(loaded.payload.files[0][1].name).toBe("draft.pdf");
    expect(await db.select({ count: count() }).from(schema.uploads)).toEqual([before]);
  });

  it("publishes a saved version once and closes its private draft atomically", async () => {
    const draft = await openWorkDraft("post", "");
    if ("error" in draft) throw new Error(draft.error);
    const fd = form();
    const saved = await saveWorkDraft(draft.id, 0, fd);
    if ("error" in saved) throw new Error(saved.error);
    fd.set("draftId", draft.id); fd.set("draftVersion", String(saved.version));
    await expect(createPost(null, fd)).rejects.toThrow("REDIRECT:");
    expect(await createPost(null, fd)).toMatchObject({ message: expect.stringMatching(/already published/) });
    expect(await saveWorkDraft(draft.id, saved.version, fd)).toHaveProperty("error");
    expect(await openWorkDraft("post", "", draft.id)).toHaveProperty("error");
  });

  it("sends revisions of removed work back to moderation and clears prior evidence review", async () => {
    await expect(createPost(null, form())).rejects.toThrow("REDIRECT:");
    const [post] = await db.select().from(schema.posts).orderBy(desc(schema.posts.id)).limit(1);
    await db.update(schema.posts).set({ status: "removed", processVerified: true, evidenceReview: { reviewerId: creator, reviewedAt: new Date().toISOString(), note: "Reviewed old version" } }).where(eq(schema.posts.id, post.id));
    const fd = form(); fd.set("editSlug", post.slug); fd.set("body", "A revised drawing and its explanation.");
    await expect(updatePost(null, fd)).rejects.toThrow("REDIRECT:");
    const [updated] = await db.select().from(schema.posts).where(eq(schema.posts.id, post.id));
    expect(updated).toMatchObject({ status: "in_review", processVerified: false, evidenceReview: null });
  });

  it("protects orders during edits and preserves buyer access after withdrawal", async () => {
    await expect(createListing(null, form("listing"))).rejects.toThrow("REDIRECT:");
    const [listing] = await db.select().from(schema.listings).orderBy(desc(schema.listings.id)).limit(1);
    await db.insert(schema.orders).values({ listingId: listing.id, buyerId: other, amountCents: 0, currency: "INR", status: "paid" });
    const edit = form("listing"); edit.set("editSlug", listing.slug); edit.set("locked", "Changed deliverable");
    expect(await updateListing(null, edit)).toMatchObject({ message: expect.stringMatching(/has orders/) });
    const withdrawal = new FormData(); withdrawal.set("slug", listing.slug);
    session.id = other; await withdrawListing(withdrawal);
    expect((await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id)))[0].status).toBe("published");
    session.id = creator; await withdrawListing(withdrawal);
    expect((await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id)))[0]).toMatchObject({ status: "withdrawn", locked: "Original buyer delivery" });
    expect(await getOrderStatus(listing.id, other)).toBe("paid");
    expect((await searchListings({})).some((l) => l.id === listing.id)).toBe(false);
  });

  it("restores product photos from a draft and applies a new cover and mixed photo order on edit", async () => {
    async function photo(colour: string) {
      const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: colour } }).png().toBuffer();
      return new File([Uint8Array.from(png)], colour + ".png", { type: "image/png" });
    }
    const fd = form("listing");
    fd.set("category", "tshirt");
    fd.delete("license");
    fd.append("photo_slot", "");
    for (const colour of ["red", "blue", "green"]) {
      fd.append("photo_slot", "upload");
      fd.append("gallery", await photo(colour));
    }
    const draft = await openWorkDraft("listing", "");
    if ("error" in draft) throw Error(draft.error);
    expect(await saveWorkDraft(draft.id, 0, fd)).toHaveProperty("version", 1);
    const restored = await openWorkDraft("listing", "", draft.id);
    if ("error" in restored) throw Error(restored.error);
    const publish = draftFormData(restored.payload);
    expect(publish.getAll("gallery").map(f => (f as File).name)).toEqual(["red.png", "blue.png", "green.png"]);
    publish.set("draftId", draft.id); publish.set("draftVersion", "1"); publish.set("attest", "on");
    await expect(createListing(null, publish)).rejects.toThrow("REDIRECT:");
    const [listing] = await db.select().from(schema.listings).orderBy(desc(schema.listings.id)).limit(1);
    expect(listing).toMatchObject({ productType: "tshirt", category: "design", license: "physical" });
    expect(listing.gallery).toHaveLength(2);
    const edit = form("listing");
    edit.set("editSlug", listing.slug);
    edit.set("category", "cap");
    edit.append("photo_slot", listing.gallery[1].file);
    edit.append("photo_slot", "upload");
    edit.append("photo_slot", listing.coverFile!);
    edit.append("gallery", await photo("yellow"));
    await expect(updateListing(null, edit)).rejects.toThrow("REDIRECT:");
    const [updated] = await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id));
    expect(updated.productType).toBe("cap");
    expect(updated.coverFile).toBe(listing.gallery[1].file);
    expect(updated.gallery).toHaveLength(2);
    expect(updated.gallery[1].file).toBe(listing.coverFile);
    expect(await db.select({ name: schema.uploads.name }).from(schema.uploads).where(eq(schema.uploads.name, listing.gallery[0].file))).toEqual([]);
  });

  it("allows an unsold listing to be revised but keeps removed listings under review", async () => {
    await expect(createListing(null, form("listing"))).rejects.toThrow("REDIRECT:");
    const [listing] = await db.select().from(schema.listings).orderBy(desc(schema.listings.id)).limit(1);
    await db.update(schema.listings).set({ status: "removed" }).where(eq(schema.listings.id, listing.id));
    const edit = form("listing"); edit.set("editSlug", listing.slug); edit.set("title", "Revised ink drawing");
    await expect(updateListing(null, edit)).rejects.toThrow("REDIRECT:");
    expect((await db.select().from(schema.listings).where(eq(schema.listings.id, listing.id)))[0]).toMatchObject({ title: "Revised ink drawing", status: "in_review" });
  });

  it("requires an admin and a current version for evidence review without changing the score", async () => {
    await expect(createPost(null, form())).rejects.toThrow("REDIRECT:");
    const [post] = await db.select().from(schema.posts).orderBy(desc(schema.posts.id)).limit(1);
    await db.update(schema.posts).set({ evidence: [{ kind: "drafts", url: "https://example.com/draft" }] }).where(eq(schema.posts.id, post.id));
    const fd = new FormData(); fd.set("kind", "post"); fd.set("id", String(post.id)); fd.set("decision", "review"); fd.set("checked", "on"); fd.set("note", "Checked the draft against the published text; earlier revisions show this passage."); fd.set("analyzedAt", "old-version");
    await expect(reviewProcessEvidence(null, fd)).rejects.toThrow("Not an admin");
    session.role = "admin";
    expect(await reviewProcessEvidence(null, fd)).toMatchObject({ message: expect.stringMatching(/changed/) });
    fd.set("analyzedAt", post.analysis.analyzedAt);
    expect(await reviewProcessEvidence(null, fd)).toMatchObject({ message: expect.stringMatching(/recorded/) });
    const [reviewed] = await db.select().from(schema.posts).where(eq(schema.posts.id, post.id));
    expect(reviewed.processVerified).toBe(true);
    expect(reviewed.evidenceReview?.reviewerId).toBe(creator);
    expect(reviewed.aiPercent).toBe(post.aiPercent);
  });
});
