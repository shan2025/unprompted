# Unprompters

**A place to explore work made by people, and buy it if it's for sale: writing, poetry, art, photography, design, music, film, code, websites, handicrafts and ideas. Every piece shows how much AI was involved.**

Each post or listing gets an **uncalibrated disclosure-and-scan score**, with a stage-by-stage breakdown. This is not a measured percentage of AI authorship or a calibrated probability; the UI no longer presents heuristic bounds as a “likely” interval.

1. **Disclosure.** The creator answers separately for idea, making, polish and assets. This sets the score's floor.
2. **Automated signals.** Text heuristics and image metadata can raise the score and trigger moderation. C2PA markers are explicitly unverified and receive no provenance credit.
3. **Process evidence.** Attachments are public but do not affect the score. Repeated URLs and identical uploaded files are rejected. An admin can record a dated evidence review with a note; publishing an edit clears that review.

When a scan disagrees strongly with a disclosure, or a file's metadata says AI was used at a stage disclosed as "No AI", the listing goes to a **human review queue** instead of going live. Read [docs/RESEARCH.md](docs/RESEARCH.md) for why it works this way: AI detectors are not reliable enough to issue verdicts.

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

For password-free local testing, set `DEV_ACCOUNT_PICKER=1` in `.env.local` and open `/login`.
Choose any account in your local database. Use **Switch test account** in the account menu to change accounts.
The picker requires a loopback host and database and runs only under `next dev`.

All demo listings are labelled **DEMO**. The creators are fictional and the sample text was written for testing.

## What works today

- Browse, search and filter by category, maximum AI %, and "process evidence reviewed"
- Listing pages with the score card, passage-by-passage highlighting, process evidence, and a locked deliverable that unlocks after purchase
- Selling: a guided form with stage-by-stage disclosure, evidence links and image upload, plus a **Check my score** preview before publishing
- Automatic review: listings where detection disagrees with the disclosure are held for a moderator
- **Journal** (`/journal`): free posts (articles, poems, art, process notes, ideas) scored exactly like listings, with comments, appreciations, following and a Following feed. Authors and moderators can delete a post for good
- Reporting listings, posts and comments, and a moderator queue to approve or remove them and resolve reports
- Buying through **seller payment links**: buyers pay the seller directly (Razorpay, PayPal, Stripe, Instamojo, PayU, Cashfree or UPI), then send a payment reference. The seller marks the order paid, which unlocks the work. Unprompters never touches the money. Free listings unlock at once, and seeded demo listings keep a demo checkout
- Exclusive licenses that close after one sale, and are reserved while a seller checks a payment; buyer and seller dashboards
- Embeddable SVG badge for each listing (`/api/badge/<slug>`)
- Public methodology page at `/standard`, and an About page at `/about` (the founder's name and profile come from `FOUNDER_NAME` and `FOUNDER_HANDLE`)
- A free "Does my writing look AI-generated?" check at `/ai-writing-check`. It runs the built-in text analyzer in the visitor's browser, so nothing they paste is uploaded
- Password reset by email (`/forgot-password`), with one-time links that expire after an hour
- Rate limits on log-in (10 tries per email from one connection, 30 per connection and 100 per email overall, every 15 minutes; a password reset clears them), sign-up (5 per connection per hour), password resets, new listings and posts (20 each per day), comments (10 per 5 minutes), reports and score checks
- Uploaded images have their metadata removed and are shrunk to 1600px; the originals aren't kept. Buyers keep access to what they bought if a listing is later removed
- Demo listings and posts are hidden on the live site and shown locally (`HIDE_DEMO_CONTENT` overrides either way)
- Light theme; mobile layouts down to 320px wide

## Not built yet (needed before real launch)

| Area | What's needed |
| --- | --- |
| Payments | Take payment on the platform, so sales don't rely on sellers confirming them by hand: Razorpay checkout, then Route (see `docs/GO-TO-MARKET.md`) |
| Detection | Add at least one commercial detector per medium via `src/lib/analysis/providers.ts` |
| Provenance | Verify C2PA signatures (today we only detect that a manifest exists) |
| File delivery | Deliverables are text or links; add secure file uploads and downloads |
| Storage | Public image copies are stored in the database; move to object storage as volume grows (`src/lib/uploads.ts`) |
| Accounts | Seller identity verification (email/phone verification already exists) |
| Moderation | Formal appeals case management and reputation history; removed work can now be revised and resubmitted to moderation |
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
| `npm run dev:supabase` | Dev server against the database in `.env.supabase` (e.g. the live Supabase one) instead of `.env.local` |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests for the analyzer and scorer |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |
| `npm run check` | Types, lint and unit tests together. Every deploy runs it first |
| `npm run setup` | Migrate and seed (`db:migrate`, `db:seed` separately) |
| `npm run db:generate` | Create a migration after editing `src/lib/db/schema.ts` |
| `npm run db:clean-uploads` | Strip metadata from and shrink images uploaded before this was automatic. Overwrites them, so it can't be undone |
| `npm run build:deploy` | What Vercel runs: check, migrate, seed an empty database, ensure the moderator, build |

## Stack

Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Supabase) · Vitest.

## Deploying (Vercel + Supabase, both have free tiers)

The site runs on [Vercel](https://vercel.com) and stores its data in a [Supabase](https://supabase.com) Postgres database. Every deploy runs `npm run build:deploy`, which first runs the type check, lint and unit tests, then updates the database tables, adds the demo listings to an empty database, makes sure your moderator account exists, and builds the site.

**If any check fails, the deploy stops before the database is touched,** and Vercel keeps serving the previous version. Open the failed deployment in Vercel to see which check broke. Run `npm run check` before pushing to catch it sooner.

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
   | `COMPANY_OWNER_USER_ID` | the user ID of the company owner in this deployment's database. This account can open **Dashboard → My merch analytics** to see sales of its Marketplace merchandise. Leave blank to disable the report. |
   | `ADMIN_PASSWORD` | a password of at least 10 characters |

3. Click **Deploy**. In a couple of minutes you get a live `https://unprompted-….vercel.app` address. Log in there with `ADMIN_EMAIL` and `ADMIN_PASSWORD` to reach `/admin`.

After that, every push to `main` redeploys automatically.

Notes:
- On the live site, demo accounts get random passwords, so nobody can log into them. There is no shared demo login.
- All tables have row-level security turned on with no policies. The app connects as the database owner; Supabase's public data API can't read anything.
- `npm run db:seed` (which wipes data) refuses to run against any database that isn't on your own machine.
- `vercel.json` only builds `main`, so branches get no preview links. To turn previews on, give them their own database first: every build runs migrations and seeding, so a preview must never point at the production `DATABASE_URL`.
- `vercel.json` runs the server in Mumbai (`bom1`), next to the Supabase database. If you move the database to another region, change `regions` to match, or every page waits on a round trip across the world.
- Supabase pauses free projects after 7 days without traffic. Restore from the dashboard, or upgrade.
- Badge links use your Vercel address automatically. Set `SITE_URL` once you add a custom domain.
- **Google Analytics (GA4)** is optional. In [Google Analytics](https://analytics.google.com/), create or reuse a Web data stream for the site and turn off **Enhanced measurement** for that stream. The app sends its own page views on public pages, including client-side navigation, with query strings removed and user-created URLs grouped by page type. Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` to the stream's `G-…` Measurement ID in Vercel's Production environment and redeploy. GA4 counts signed-out visitors and signed-in members, and skips signed-in admins and the configured company owner. Add other team login emails or numeric account IDs to the server-only `GA4_EXCLUDED_ACCOUNTS` variable as a comma-separated list. The tag is disabled on Vercel preview deployments and when running `next dev`. Confirm a test visit from a public browser session in GA4 **Realtime**.
- The terms, privacy, refunds and contact pages read `LEGAL_NAME`, `CONTACT_EMAIL`, `LEGAL_ADDRESS` and `GRIEVANCE_OFFICER`. Set them once the business is registered, then redeploy. The page text is a starting draft and needs a lawyer's review.
- **Log in with Google** needs a Google OAuth client. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a project, set up the OAuth consent screen (External, with your app name and support email), then **Create credentials → OAuth client ID → Web application**. Add `https://www.unprompters.com/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for local testing) under **Authorized redirect URIs**. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel and redeploy, and make sure `SITE_URL` matches the address people use (e.g. `https://www.unprompters.com`), since the redirect URI is built from it. Someone whose verified Google email already has an account is logged into it; anyone else gets a new account. Without the keys, the button is hidden.
- **Password-reset emails** need a free [Resend](https://resend.com) account: set `RESEND_API_KEY`, and `EMAIL_FROM` once you've verified your domain in Resend (until then Resend only delivers to your own address). Without a key, emails are printed to the server log when running locally.
- **Demo content** is hidden on the live site (Vercel production) and shown everywhere else. Set `HIDE_DEMO_CONTENT=false` to show it on the live site, or `=true` to hide it locally, then redeploy. Nothing is deleted.
- **Error emails:** every server error is written to the log as a line starting `[error]`. Set `ERROR_EMAIL` (it falls back to `ADMIN_EMAIL`) to also get an email the first time each error happens in an hour, ten a day at most. Needs `RESEND_API_KEY`.
- Vercel's free Hobby plan is for non-commercial use. Move to a paid plan before taking real payments.

## Screenshots

| Listing | Sell form with score preview |
| --- | --- |
| ![Listing](docs/screenshots/listing.jpg) | ![Sell](docs/screenshots/sell.jpg) |

## Drafts, revisions and evidence reviews

Apply the new migration with `npm run db:migrate` before starting the updated app. The migration adds private drafts and review fields, and the migration script upgrades historic scores to remove attachment discounts and automatic verification. This backfill leaves moderation decisions intact.

- New posts, new listings and edits autosave to the account. Attachments are stored privately in the draft, not through the public upload route. The dashboard lists saved drafts.
- An IndexedDB recovery copy stays on the device. When it differs from the account copy, the editor asks which to use. Saving and publishing check the draft version; stale tabs cannot overwrite or republish it. Ownership attestations must be checked again after recovery.
- Publishing consumes the saved draft in the same database transaction. Work in review or removed by moderators returns to review on resubmission. Edits clear any previous process-evidence review.
- Creators can edit unsold listings and withdraw published listings. Listings with pending, paid, demo or refunded orders retain their original work and terms; create a new listing for a new version. Withdrawal leaves existing orders and buyer access intact.
- Admins record evidence reviews on the work detail page after opening the sources, confirming relevance and writing a review note. Reviews do not change numeric scores or claim cryptographic verification.

### Qikink company merchandise

Use the normal Sell form and choose a Merchandise product type. In Qikink My Products, prepare the print design and get the SKU for each purchasable size or colour. In the server environment, set `QIKINK_CATALOG` to JSON mapping the Unprompters listing slug to its variants, for example `{"company-tee":{"Black / M":"YOUR-QIKINK-SKU"}}`. Only the designated company owner's mapped listings use shipping checkout.

Set `QIKINK_CLIENT_ID`, `QIKINK_CLIENT_SECRET` and `QIKINK_ENV` alongside the existing Cashfree credentials. Start with both providers in `sandbox` and use a product SKU available in that Qikink environment. For production, configure the production credentials and SKUs for both providers. Restart or redeploy after changing server settings.

Checkout supports prepaid INR orders for one item delivered in India. Once Cashfree confirms the amount and currency, the app sends the order to Qikink using the reference `UNP<payment id>`. The owner's **Dashboard → My merch analytics → Recent Qikink orders** shows the handoff. For an uncertain submission, look up that exact reference in Qikink before retrying. A successful handoff records submission to Qikink, not shipment by a courier.

### Database regression checks

`npm test` runs the unit suite. The PostgreSQL integration suite additionally needs `TEST_DATABASE_URL` pointing to an empty, disposable database named `unprompted_publishing_test_<timestamp>` on localhost. It runs the checked-in migrations and creates only test data. Run `npx vitest run tests/publishing.integration.test.ts` with that environment variable. Never point it at a production database.

The eight existing prose, poetry, and code fixtures score at the expected extremes: five human or human-style examples at 0 and three machine-style examples at 100 for the text scan. These examples were selected for regression testing and cannot calibrate the estimate for new work. Calibration requires an independent, consented corpus with recorded AI use, including mixed workflows, and an evaluation of false holds and uncertainty by medium. C2PA signature verification remains unconfigured.
