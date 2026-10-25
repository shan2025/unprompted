# Unprompted

**A marketplace for work made by people: code, websites, writing, poetry, art, photography, design, music and ideas. Every listing shows how much AI was involved.**

Each listing gets an **AI-involvement estimate**, for example *"3% · likely 2–13% · Human-made"*. It's built from three sources and shown with its reasoning:

1. **Disclosure.** The creator says, stage by stage (idea, making, polish, supporting assets), whether AI was used: none, light, substantial or generated. This is the floor: we never show less AI than the creator admits to.
2. **Automated analysis.** Text, poetry and code are scanned passage by passage for machine-writing patterns. Images are scanned for generator tags, IPTC "trained algorithmic media" markers and C2PA Content Credentials. Scans can only *raise* an estimate, in proportion to their confidence.
3. **Process evidence.** Drafts, time-lapses and commit history narrow the range and are shown publicly.

When a scan disagrees strongly with a disclosure, the listing goes to a **human review queue** instead of going live. Read [docs/RESEARCH.md](docs/RESEARCH.md) for why it works this way: AI detectors are not reliable enough to issue verdicts.

![Home page](docs/screenshots/home.jpg)

## Quick start

Requires Node 20+.

```bash
npm install
npm run setup     # creates the SQLite database and loads demo data
npm run dev       # http://localhost:3000
```

Demo accounts (password `demo-password`):

| Email | Role |
| --- | --- |
| `admin@unprompted.test` | Moderator: sees the review queue at `/admin` |
| `mara@unprompted.test` | Creator with poetry and fiction listings |
| `alex@unprompted.test` | Buyer with two purchases |

All demo listings are labelled **DEMO**. The creators are fictional and the sample text was written for testing.

## What works today

- Browse, search and filter by category, maximum AI %, and "process verified only"
- Listing pages with the score card, passage-by-passage highlighting, process evidence, and a locked deliverable that unlocks after purchase
- Selling: a guided form with stage-by-stage disclosure, evidence links and image upload, plus a **Check my score** preview before publishing
- Automatic review: listings where detection disagrees with the disclosure are held for a moderator
- Reporting listings, and a moderator queue to approve or remove listings and resolve reports
- Buying (**demo checkout**, no payment taken), exclusive licenses that close after one sale, buyer and seller dashboards
- Embeddable SVG badge for each listing (`/api/badge/<slug>`)
- Public methodology page at `/standard`
- Light and dark mode; mobile layouts

## Not built yet (needed before real launch)

| Area | What's needed |
| --- | --- |
| Payments | Replace the demo order in `src/app/actions/listings.ts` (`buyListing`) with Stripe Connect or a merchant-of-record |
| Detection | Add at least one commercial detector per medium via `src/lib/analysis/providers.ts` |
| Provenance | Verify C2PA signatures (today we only detect that a manifest exists) |
| File delivery | Deliverables are text or links; add secure file uploads and downloads |
| Storage | Images (up to 4 MB) are stored in the database; move to object storage as volume grows (`src/lib/uploads.ts`) |
| Accounts | Email verification, password reset, seller identity verification, rate limiting |
| Moderation | Creator appeals UI, edit and relist after review, reputation history |
| Legal | Terms of service, DMCA process, refund policy (see the research doc) |

## How scoring works (code)

| File | What it does |
| --- | --- |
| `src/lib/scoring.ts` | Combines disclosure, detections and evidence into the estimate, range, tier and review flag |
| `src/lib/categories.ts` | Categories and how much each stage counts per category |
| `src/lib/analysis/text.ts` | Built-in heuristic analyzer for prose, poetry and code |
| `src/lib/analysis/media.ts` | Image metadata scan (generator tags, IPTC, C2PA, EXIF) |
| `src/lib/analysis/providers.ts` | Plug-in point for external detectors |
| `src/lib/assess.ts` | Runs everything for a listing |

Tiers: **Human-made** 0–5% · **Human-led** 6–20% · **AI-assisted** 21–50% · **AI-heavy** over 50% (new listings must disclose 50% or less).

The built-in analyzer is a transparent baseline, not a production detector. Its confidence is capped at 55% for prose and lower for poetry and code. The tests in `tests/` calibrate it against public-domain human writing (Thoreau, Frost, Dickinson) and typical chatbot output.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests for the analyzer and scorer |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run setup` | Migrate and seed (`db:migrate`, `db:seed` separately) |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |
| `npm run build:deploy` | What Vercel runs: migrate, seed an empty database, ensure the moderator, build |

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · libSQL/SQLite · Vitest.

## Deploying (Vercel + Turso, both have free tiers)

The app runs on [Vercel](https://vercel.com) with a hosted [Turso](https://turso.tech) database. Every deploy runs `npm run build:deploy`, which updates the database schema, adds the demo listings to an empty database, makes sure your moderator account exists, and builds the site.

**1. Create the database (Turso)**

1. Sign up at [turso.tech](https://turso.tech) (GitHub login works) and create a database, e.g. `unprompted`.
2. On the database page, copy its URL (`libsql://unprompted-<you>.turso.io`).
3. Create a database token and copy it.

**2. Create the site (Vercel)**

1. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and import `shan2025/unprompted`.
2. Before clicking **Deploy**, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the Turso URL from step 1 |
   | `DATABASE_AUTH_TOKEN` | the Turso token from step 1 |
   | `ADMIN_EMAIL` | the email you'll use to moderate |
   | `ADMIN_PASSWORD` | a password of at least 10 characters |

3. Click **Deploy**. In a couple of minutes you get a live `https://unprompted-….vercel.app` address. Log in there with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to reach `/admin`.

After that, every push to `main` redeploys automatically.

Notes:
- On the live site, demo accounts get random passwords, so nobody can log into them. There is no shared demo login.
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` also work, if you connect Turso through Vercel's Storage tab instead.
- Badge links use your Vercel address automatically. Set `SITE_URL` once you add a custom domain.
- Vercel's free Hobby plan is for non-commercial use. Move to a paid plan before taking real payments.
- Elsewhere: any Node host works. With a persistent disk you can skip Turso, since the default is a local SQLite file in `data/`.

## Screenshots

| Listing | Sell form with score preview |
| --- | --- |
| ![Listing](docs/screenshots/listing.jpg) | ![Sell](docs/screenshots/sell.jpg) |
