// Demo data. Every listing is flagged as a demo and shown with a DEMO label:
// the "creators" are fictional and the sample text was written for testing,
// so none of it should pass as real human work.
//
//   npm run db:seed               Local: wipes the database, demo password for every account.
//   tsx scripts/seed.mts --deploy Live site: only seeds an empty database, demo accounts get
//                                 random passwords, and no moderator is created (see ensure-admin).

import { randomBytes } from "node:crypto";
import { count } from "drizzle-orm";
import { assess } from "../src/lib/assess";
import type { CategoryId, LicenseId } from "../src/lib/categories";
import { closeDb, db, schema } from "../src/lib/db";
import { databaseUrl, isLocalDatabase } from "../src/lib/db/config";
import { hashPassword } from "../src/lib/password";
import type { Disclosure, Evidence } from "../src/lib/scoring";

const DEPLOY = process.argv.includes("--deploy");
const DEMO_PASSWORD = DEPLOY ? randomBytes(24).toString("base64url") : "demo-password";
const DAY = 24 * 60 * 60 * 1000;

const NONE: Disclosure = { ideation: "none", creation: "none", refinement: "none", assets: "none" };

const people = [
  { handle: "team", name: "Unprompted Team", email: "admin@unprompted.test", role: "admin" as const, bio: "Moderation account." },
  { handle: "mara", name: "Mara Okafor", email: "mara@unprompted.test", bio: "Poems and short fiction. Drafts in pencil, always." },
  { handle: "tomas", name: "Tomás Reyes", email: "tomas@unprompted.test", bio: "Small, boring, reliable software." },
  { handle: "priya", name: "Priya Natarajan", email: "priya@unprompted.test", bio: "Ink, watercolour and lettering, painted on the Moray coast." },
  { handle: "june", name: "June Halvorsen", email: "june@unprompted.test", bio: "Photographs fog. Plays an out-of-tune piano." },
  { handle: "sam", name: "Sam Whitley", email: "sam@unprompted.test", bio: "Product ideas from talking to people who fix things." },
  { handle: "kai", name: "Kai Moreno", email: "kai@unprompted.test", bio: "" },
  { handle: "alex", name: "Alex Buyer", email: "alex@unprompted.test", bio: "Buys things. Demo account." },
];

interface SeedListing {
  by: string;
  title: string;
  category: CategoryId;
  summary: string;
  preview: string;
  locked?: string;
  price: number;
  license: LicenseId;
  disclosure: Disclosure;
  evidence: Evidence[];
  aiNotes?: string;
}

const items: SeedListing[] = [
  {
    by: "mara",
    title: "Salt Year: twelve poems",
    category: "poetry",
    summary: "A chapbook about moving house four times in one year, and the coffee tin that came along.",
    preview: `My mother kept the salt in a coffee tin
with the label half scraped off,
Maxwell House, 1987,
and every Sunday she'd pinch it over the eggs
like she was paying a toll.

I moved four times last year.
The tin came with me each time,
empty since March,
because I can't decide what goes in it now.`,
    locked: `[Demo placeholder: the remaining eleven poems would be delivered here as text and a print-ready PDF.]`,
    price: 12,
    license: "personal",
    disclosure: NONE,
    evidence: [
      { kind: "drafts", url: "https://example.com/demo/salt-year-notebook-scans", note: "Scans of the pencil notebook drafts" },
      { kind: "version-history", url: "https://example.com/demo/salt-year-doc-history", note: "Document revision history" },
    ],
    aiNotes: "None. Spellcheck was on, that's it.",
  },
  {
    by: "mara",
    title: "The Night Ferry (short story)",
    category: "writing",
    summary: "A 4,000-word story about missing the last boat, almost. Literary fiction, one sitting.",
    preview: `The ferry left at 11:40, which Dana had known since Tuesday and still somehow forgot. She ran the last block with her shoes in her hand. The ticket man didn't look up. "You're lucky," he said, which she was not, not really. Her phone was at four percent and the cabin she'd paid for turned out to be a bench near the vending machine.

She slept anyway. Around two a kid kicked her shin by accident and apologized in a language she didn't know, and she said it's okay, it's okay, until the kid's father came and carried him off like a sack of flour.`,
    locked: `[Demo placeholder: the full story would be delivered here.]`,
    price: 6,
    license: "personal",
    disclosure: { ...NONE, refinement: "light" },
    evidence: [{ kind: "version-history", url: "https://example.com/demo/night-ferry-history", note: "Twelve saved drafts over six weeks" }],
    aiNotes: "I ran the finished draft through a grammar checker and accepted about a dozen comma fixes.",
  },
  {
    by: "tomas",
    title: "retry-later: a tiny TypeScript retry helper",
    category: "code",
    summary: "Exponential backoff with full jitter, typed, zero dependencies. The one I keep copy-pasting.",
    preview: `// retry-later: the retry helper I keep copy-pasting between projects.
// No deps. Works in Node 18+ and the browser.

export type RetryOpts = {
  tries?: number; // total attempts, not retries. 4 = 1 + 3 retries
  base?: number; // ms
  cap?: number; // ms, so we don't sleep for an hour on attempt 12
  retryIf?: (err: unknown) => boolean;
};

export async function retry<T>(fn: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const { tries = 4, base = 200, cap = 5_000, retryIf = () => true } = opts;
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i === tries - 1 || !retryIf(err)) break;
      // full jitter. the AWS architecture blog post is still the best explanation of why
      const wait = Math.random() * Math.min(cap, base * 2 ** i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

// TODO: AbortSignal support. Somebody asked for it in March and I keep forgetting.`,
    locked: `[Demo placeholder: full source, tests and README would be delivered as a download link here.]`,
    price: 15,
    license: "commercial",
    disclosure: NONE,
    evidence: [{ kind: "version-history", url: "https://example.com/demo/retry-later-commits", note: "Commit history back to 2022" }],
  },
  {
    by: "tomas",
    title: "Field Notes: a quiet theme for writers",
    category: "website",
    summary: "One column, one font, margin footnotes. Eleventy, Hugo and plain HTML versions.",
    preview: `Field Notes is the theme I built for my own blog after getting tired of themes that look like landing pages. It's one column, it loads in about 40ms, and it has exactly one font (Charter, which your Mac already has). Footnotes go in the margin on wide screens and drop inline on phones.

What's in the box: six templates (home, post, archive, tag, about, 404), dark mode that follows the system, an RSS feed, and a print stylesheet because some people still print things.`,
    locked: `[Demo placeholder: theme download links would be delivered here.]`,
    price: 29,
    license: "commercial",
    disclosure: { ...NONE, assets: "light" },
    evidence: [
      { kind: "version-history", url: "https://example.com/demo/field-notes-repo", note: "Public repo history" },
      { kind: "timelapse", url: "https://example.com/demo/field-notes-build-video", note: "Two-hour screen recording of the footnote layout" },
    ],
    aiNotes: "The demo posts in the preview site use placeholder text I generated. The theme itself is hand-written.",
  },
  {
    by: "priya",
    title: "Harbour at 6am (original ink & watercolour)",
    category: "art",
    summary: "Original painting, 30 × 40 cm on cold-press paper. Painted over three mornings from the sea wall.",
    preview: `Ink and watercolour on 300gsm cold-press, 30 × 40 cm. I painted this over three mornings from the sea wall at Portsoy, mostly before the boats went out. The left-hand mast is wrong and I've decided I like it wrong.

You're buying the original. I'll ship it flat, between boards, wherever you are. The time-lapse of the second morning is linked below.`,
    price: 80,
    license: "exclusive",
    disclosure: NONE,
    evidence: [
      { kind: "timelapse", url: "https://example.com/demo/harbour-timelapse", note: "Time-lapse of the second morning" },
      { kind: "sketches", url: "https://example.com/demo/harbour-sketchbook", note: "Pencil studies from the sketchbook" },
    ],
  },
  {
    by: "priya",
    title: "Walnut Caps: a hand-lettered display alphabet",
    category: "design",
    summary: "26 capitals and 10 numerals drawn with a ruling pen, delivered as OTF and SVG.",
    preview: `Twenty-six capitals and ten numerals, drawn with a ruling pen and walnut ink, scanned at 1200 dpi and cleaned up by hand. I used auto-trace for the first vector outlines, then redrew most of the curves. Auto-trace is partly machine-learning based these days, so I've counted it as light help in editing.`,
    locked: `[Demo placeholder: font files would be delivered here.]`,
    price: 18,
    license: "commercial",
    disclosure: { ...NONE, refinement: "light" },
    evidence: [{ kind: "sketches", url: "https://example.com/demo/walnut-caps-scans", note: "Original ink sheets, scanned" }],
  },
  {
    by: "june",
    title: "Sea Fog, eight prints",
    category: "photography",
    summary: "Eight photographs from one week of fog on the Oregon coast. Archival pigment prints.",
    preview: `Eight photographs from one week of sea fog on the Oregon coast, shot on a Fuji X-T4. Edited in Lightroom. I used its AI denoise on two frames shot at ISO 6400, which is why my disclosure says light help in editing. No skies replaced, nothing added or removed.`,
    price: 40,
    license: "personal",
    disclosure: { ...NONE, refinement: "light" },
    evidence: [{ kind: "sketches", url: "https://example.com/demo/sea-fog-raws", note: "Contact sheet of the RAW files" }],
  },
  {
    by: "june",
    title: "Kitchen Piano: 24 loops",
    category: "music",
    summary: "Upright piano loops recorded in a kitchen, slightly out of tune on purpose. WAV, 24-bit.",
    preview: `Twenty-four piano loops recorded on the upright in my kitchen (it's slightly out of tune; that's the point). 80 to 95 BPM, dry and with room mic. The playing is all me, mistakes included. Mastering went through an AI mastering service, and the cover art was generated. Both are in the disclosure.`,
    locked: `[Demo placeholder: download link for the stems would be delivered here.]`,
    price: 14,
    license: "commercial",
    disclosure: { ...NONE, refinement: "light", assets: "substantial" },
    evidence: [{ kind: "recording", url: "https://example.com/demo/kitchen-piano-session", note: "Phone video of one session" }],
  },
  {
    by: "sam",
    title: "Repair café booking app: full concept",
    category: "idea",
    summary: "A complete product concept, from interviews with four repair cafés. Exclusive: sold once.",
    preview: `Repair cafés run on clipboards. Volunteers don't know what's coming, and people queue for an hour to be told the part isn't available. This is a complete concept for a booking tool built around how they actually work: an intake form with photos, triage by skill, and a parts wishlist local hardware shops can see.

You get a 14-page write-up, user flows for three roles, a data model, rough costings, and notes from interviews with organisers at four cafés.`,
    locked: `[Demo placeholder: the full concept document would be delivered here.]`,
    price: 35,
    license: "exclusive",
    disclosure: { ...NONE, refinement: "light" },
    evidence: [{ kind: "drafts", url: "https://example.com/demo/repair-cafe-interview-notes", note: "Handwritten interview notes" }],
    aiNotes: "I used AI to proofread the final write-up. The idea and interviews are mine.",
  },
  {
    by: "sam",
    title: "Pitch deck copy pack",
    category: "writing",
    summary: "Slide-by-slide copy templates for early-stage pitch decks, with worked examples.",
    preview: `Unlock the full potential of your startup's story with this comprehensive pitch deck copy pack. Whether you're a seasoned founder or just starting out, these templates help you navigate the complexities of fundraising. Moreover, each slide is crafted to resonate with investors—from problem to traction to the ask.

I drafted the structure and the worked examples myself, then had an AI tool write first drafts of each slide's copy and edited every one. That's why the making stage says substantial.`,
    locked: `[Demo placeholder: the copy templates would be delivered here.]`,
    price: 20,
    license: "commercial",
    disclosure: { ...NONE, creation: "substantial" },
    evidence: [],
    aiNotes: "AI drafted slide copy from my outline; I rewrote or edited all of it.",
  },
  {
    by: "kai",
    title: "Sunset Dreams",
    category: "poetry",
    summary: "A poem about evening light.",
    preview: `In the quiet of the twilight hour,
The stars above begin to glow,
Soft whispers dance on gentle breeze,
A tapestry of dreams below.

The silver moon in velvet skies,
Embraces hearts with tender light,
Eternal echoes softly rise,
As boundless dreams take flight.

The golden light begins to fade,
A symphony of hues so bright,
The ember sky, a serenade,
Surrenders gently to the night.

And in the stillness, hearts will find
The solace that the evening brings,
A luminous and gentle mind,
Where every whispered moment sings.`,
    price: 5,
    license: "personal",
    disclosure: NONE,
    evidence: [],
  },
];

if (DEPLOY) {
  const [{ n }] = await db.select({ n: count() }).from(schema.users);
  if (n > 0) {
    console.log("Database already has accounts; skipping demo data.");
    process.exit(0);
  }
  people.splice(people.findIndex((p) => p.handle === "team"), 1);
} else {
  if (!isLocalDatabase(databaseUrl())) {
    console.error("Refusing to wipe a database that isn't on this machine. Use --deploy for hosted databases.");
    process.exit(1);
  }
  await db.delete(schema.flags);
  await db.delete(schema.orders);
  await db.delete(schema.listings);
  await db.delete(schema.sessions);
  await db.delete(schema.uploads);
  await db.delete(schema.users);
}

const passwordHash = await hashPassword(DEMO_PASSWORD);
const ids = new Map<string, number>();
for (const p of people) {
  const [row] = await db
    .insert(schema.users)
    .values({ ...p, role: p.role ?? "member", passwordHash, createdAt: new Date(Date.now() - 90 * DAY) })
    .returning({ id: schema.users.id });
  ids.set(p.handle, row.id);
}

const listingIds = new Map<string, number>();
for (const [i, item] of items.entries()) {
  const result = await assess({
    category: item.category,
    preview: item.preview,
    locked: item.locked ?? "",
    disclosure: item.disclosure,
    evidence: item.evidence,
  });
  const { score } = result;
  const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const [row] = await db
    .insert(schema.listings)
    .values({
      slug,
      creatorId: ids.get(item.by)!,
      title: item.title,
      category: item.category,
      summary: item.summary,
      preview: item.preview,
      locked: item.locked ?? "",
      aiNotes: item.aiNotes ?? "",
      priceCents: item.price * 100,
      license: item.license,
      status: score.needsReview ? "in_review" : "published",
      aiPercent: score.percent,
      aiLow: score.low,
      aiHigh: score.high,
      tier: score.tier,
      processVerified: score.processVerified,
      disclosure: item.disclosure,
      evidence: result.evidence,
      analysis: {
        score,
        previewSegments: result.preview?.segments ?? [],
        previewKind: result.preview?.kind ?? null,
        signals: result.preview?.signals ?? [],
        media: result.media,
        sources: result.sources,
        analyzedAt: new Date().toISOString(),
      },
      isDemo: true,
      createdAt: new Date(Date.now() - (items.length - i) * DAY),
    })
    .returning({ id: schema.listings.id });
  listingIds.set(item.title, row.id);
  console.log(
    `${score.needsReview ? "REVIEW" : "listed"}  ${String(score.percent).padStart(3)}% (${score.low}-${score.high})  ${score.tier.padEnd(11)}  ${item.title}`,
  );
}

const alex = ids.get("alex")!;
for (const title of ["Salt Year: twelve poems", "retry-later: a tiny TypeScript retry helper"]) {
  const listingId = listingIds.get(title)!;
  const item = items.find((x) => x.title === title)!;
  await db.insert(schema.orders).values({ listingId, buyerId: alex, amountCents: item.price * 100, status: "demo" });
}
await db.insert(schema.flags).values({
  listingId: listingIds.get("Pitch deck copy pack")!,
  reporterId: alex,
  reason: "undisclosed-ai",
  details: "The first paragraph reads fully generated to me. Is 30% really right?",
});

if (DEPLOY) {
  console.log(`\nSeeded ${people.length} demo accounts (random passwords) and ${items.length} demo listings.`);
} else {
  console.log(`\nSeeded ${people.length} accounts (password: ${DEMO_PASSWORD}) and ${items.length} demo listings.`);
  console.log("Admin login: admin@unprompted.test");
}

await closeDb();
