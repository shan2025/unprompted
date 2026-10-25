# Unprompted

**A marketplace for work made by people: code, websites, writing, poetry, art, photography, design, music and ideas. Every listing shows how much AI was involved.**

Each listing gets an **AI-involvement estimate**, for example *"3% · likely 2–13% · Human-made"*. It's built from three sources and shown with its reasoning:

1. **Disclosure.** The creator says, stage by stage (idea, making, polish, supporting assets), whether AI was used: none, light, substantial or generated. This is the floor: we never show less AI than the creator admits to.
2. **Automated analysis.** Text, poetry and code are scanned passage by passage for machine-writing patterns. Images are scanned for generator tags, IPTC "trained algorithmic media" markers and C2PA Content Credentials. Scans can only *raise* an estimate, in proportion to their confidence.
3. **Process evidence.** Drafts, time-lapses and commit history narrow the range and are shown publicly.

When a scan disagrees strongly with a disclosure, the listing goes to a **human review queue** instead of going live. Read [docs/RESEARCH.md](docs/RESEARCH.md) for why it works this way: AI detectors are not reliable enough to issue verdicts.

![Home page](docs/screenshots/home.jpg)

New visitors start at `/start`, a three-question setup (sell or buy, what kind of work, how much AI) that sends sellers to a pre-filled listing form and buyers to a filtered market.

![Get started](docs/screenshots/start.jpg)

## Quick start

Requires Node 20+ and a PostgreSQL database. Locally, any Postgres works (Postgres.app, Homebrew, Docker, or `supabase start`). By default the app connects to `postgres://postgres:postgres@localhost:5432/unprompted`; set `DATABASE_URL` in `.env.local` to use something else.

```bash
npm install
npm run setup     # creates the tables and loads demo data (local databases only)
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

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Supabase) · Vitest.

## Deploying (Vercel + Supabase, both have free tiers)

The site runs on [Vercel](https://vercel.com) and stores its data in a [Supabase](https://supabase.com) Postgres database. Every deploy runs `npm run build:deploy`, which updates the database tables, adds the demo listings to an empty database, makes sure your moderator account exists, and builds the site.

**1. Get the database connection string (Supabase)**

1. Open your Supabase project and click **Connect** at the top.
2. Choose **Transaction pooler** and copy the URI. It looks like `postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-….pooler.supabase.com:6543/postgres`.
3. Replace `[YOUR-PASSWORD]` with your database password. If you've forgotten it, reset it under Project Settings → Database.

**2. Create the site (Vercel)**

1. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and import `shan2025/unprompted`. Skip any suggested storage integrations.
2. Before clicking **Deploy**, open **Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the connection string from step 1 |
   | `ADMIN_EMAIL` | the email you'll use to moderate |
   | `ADMIN_PASSWORD` | a password of at least 10 characters |

3. Click **Deploy**. In a couple of minutes you get a live `https://unprompted-….vercel.app` address. Log in there with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to reach `/admin`.

After that, every push to `main` redeploys automatically.

Notes:
- On the live site, demo accounts get random passwords, so nobody can log into them. There is no shared demo login.
- All tables have row-level security turned on with no policies. The app connects as the database owner; Supabase's public data API can't read anything.
- `npm run db:seed` (which wipes data) refuses to run against any database that isn't on your own machine.
- Supabase pauses free projects after 7 days without traffic. Restore from the dashboard, or upgrade.
- Badge links use your Vercel address automatically. Set `SITE_URL` once you add a custom domain.
- Vercel's free Hobby plan is for non-commercial use. Move to a paid plan before taking real payments.

## Screenshots

| Listing | Sell form with score preview |
| --- | --- |
| ![Listing](docs/screenshots/listing.jpg) | ![Sell](docs/screenshots/sell.jpg) |
