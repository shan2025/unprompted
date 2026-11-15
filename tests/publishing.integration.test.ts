import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { count, desc, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";

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
import { getOrderStatus, searchListings } from "@/lib/data";
import { STAGES } from "@/lib/scoring";

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
