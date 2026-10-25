# Go-to-market plan: from working site to first sales

*October 2026. Where we are, what's blocking us, and the order to do things in. Sources at the end. Figures from secondary sources are flagged.*

## Where we are

**Built:** marketplace with AI-involvement scores, sell form with score preview, review queue, reports, creator profiles, embeddable badges, guided `/start` entry page, deployed on Vercel + Supabase.

**Not built yet:** real payments, password reset and email, secure file delivery, legal pages, SEO basics (sitemap, share images, structured data).

**Biggest risk right now:** not the product, but an empty marketplace. Buyers don't come to empty shelves, and sellers don't list where there are no buyers.

---

## 1. Positioning: who we are, in one line

> **The marketplace that shows how much AI is in everything it sells.**

Not "anti-AI". "Transparent about AI." That's more honest (AI use is a spectrum), it's defensible (we don't claim to detect what detectors can't), and it gives AI-assisted creators a reason to join too.

**Name:** move to **Unprompters** (unprompters.com is available). "Unprompted" is crowded: an AI security conference, an AI-art guessing game, and a creative-writing app already use it. "Made by Unprompters" works as a tagline and a community name.

**Start narrow.** "Sell anything non-AI" is the vision, not the launch. Launch with the two groups that care most and already have process evidence:

| Launch with | Why |
| --- | --- |
| **Illustrators and artists** | The angriest about AI, and proven to move: Cara went from 40,000 to 650,000 users in a week in June 2024 when Meta announced AI training on posts. Time-lapses and sketches are natural evidence. |
| **Writers and poets** | Authors Guild "Human Authored" has certified 5,000+ books, so writers already seek this. Draft history is natural evidence. |
| Later: code, music, ideas, design | Code buyers care less about human authorship; ideas are legally weak to sell. Add once the core works. |

**Watch:** [Fybe](https://fybe.art/), a no-AI, no-drop-shipping Etsy alternative for **fiber arts** (cross-stitch, embroidery, knitting), founded by Rachel Powell in Maine. It opened to sellers around August 2026, was crowdfunded, uses volunteer moderators, and charges 5% at most. No revenue or funding figures are public. It isn't a direct competitor, but it is proof that sellers will move over AI, and its 5% fee sets creators' expectations. Our difference: graded transparency (a % with a range, not a yes/no rule), writing as well as art, and the embeddable badge that travels with the work.

---

## 2. Getting the first 100 sellers (supply first)

Marketplace research is consistent: recruit sellers by hand in a narrow niche before spending anything on buyers.

**Founding Unprompters program**
- Hand-pick 100 creators. Offer: **0% commission for the first year**, a permanent "Founding Unprompter" badge, and a featured spot on the home page.
- **Do the work for them.** Ask permission, then create their first listing from their existing portfolio. Your time is the cheapest growth channel you have.
- Ask each one to post their badge and listing link once. Each badge on a creator's site or bio is free promotion and a backlink.

**Where to find them**
- Instagram artist and poetry communities (search the hashtags `#noai`, `#humanmade`, `#instapoetry`, `#indianartist`)
- Cara, Behance, Dribbble
- Reddit: r/ArtistLounge, r/writing, r/Poetry (read each subreddit's self-promotion rules first)
- Fine-arts and design colleges: students want income and portfolios
- Substack writers, open-mic and poetry collectives, NaNoWriMo-style writing groups
- Authors with Authors Guild "Human Authored" certified books

**Message that works:** don't pitch a platform, pitch a benefit. *"Your work keeps getting called AI. Here's a page that proves it isn't, with your process attached, and a badge you can put anywhere."*

**Be ready for the next AI controversy.** Cara's growth came from one news moment. Keep a ready-to-post page and message ("Leaving because your art is being used to train AI? Here's a place that shows its work") and publish the day it happens.

---

## 3. Getting buyers

1. **Creators bring their own audiences first.** Every founding creator who shares their listing brings buyers at zero cost. That's why the badge and share images matter.
2. **Gifting and collectors:** original art, commissioned poems and prints are gifts people pay a premium for when they know a person made them.
3. **Businesses (the bigger money):** brands, agencies and publishers increasingly want human-made illustration and copy, and want proof they can show their own customers. Add a "commission a human" request form later; this is where larger orders are.
4. **Launches:** Product Hunt, Hacker News "Show HN", and Indian startup press (YourStory, Inc42). The angle: *an Indian founder built a marketplace that shows how much AI is in art.*

---

## 4. SEO: what to build and what to write

**Technical (missing today, quick to add):**
- `sitemap.xml` and `robots.txt`
- Page titles and descriptions for every listing, category and creator page
- **Share images:** each listing shows its title and AI score when shared on WhatsApp, X or LinkedIn
- Product structured data (price, availability) so Google can show rich results
- Category landing pages with real text: "Human-made illustration for sale", "Poetry written without AI"

**A free tool as the traffic magnet:**
- **"Does my writing look AI-generated?"**: paste text, see the passage-by-passage analysis we already built, with an honest explanation of detector limits. Students, writers and freelancers search for this constantly because they get falsely accused. At the end: *"Made it yourself? List it and prove it."*
- **Badge generator:** creators get a "Human-made" badge for their own site, linking back to us.

**Content worth writing** (each is a real search people make):
- How to prove your art isn't AI-generated
- Why AI detectors flag human writing (and what to do about it)
- What counts as "human-made"? Our standard, explained
- Monthly creator spotlights (also good for social media)

---

## 5. Payments: how buyers will actually pay

There are real constraints for an India-based marketplace:
- **Stripe** has been invite-only in India since May 2024, and Stripe Connect payouts to Indian sellers are uncertain.
- **Lemon Squeezy prohibits marketplaces** that sell other people's products, and **Paddle** is built for software companies.
- **Razorpay Route** (automatic split payouts to sellers) now requires, under RBI's September 2025 rules, either more than ₹40 lakh domestic turnover or more than ₹5 lakh export turnover. Below that, Razorpay's suggested fallback is to collect the payment and pay sellers manually.

**So, in three stages:**

| Stage | How it works | Needs |
| --- | --- | --- |
| **0. Now** | Each seller adds their own payment link (Razorpay Payment Link, UPI, PayPal). "Buy" goes to that link and the seller delivers. We take no cut, and handle no money. | Nothing. About a day of work for me. |
| **1. First revenue** | The platform takes payment through standard Razorpay checkout (cards, UPI, netbanking, international cards), then pays sellers manually or in batches, keeping a commission. | A registered business, a current account, GST registration, and terms, privacy and refund pages on the site (Razorpay checks these). |
| **2. Scale** | Razorpay Route splits each payment automatically between seller and platform. | Turnover above the RBI thresholds. |

**Ask a chartered accountant before Stage 1.** Marketplaces in India have specific GST rules for e-commerce operators (including collecting tax at source on sellers' sales), and holding customer money for others has regulatory implications. One hour with a CA now avoids expensive mistakes.

---

## 6. If you approach Y Combinator (or any investor)

**What YC asks** (themes from third-party guides; confirm on ycombinator.com/apply):
- What you make, in one line, and what the company does
- **Why you?** Why this idea, and what you understand that others don't
- Competitors, and why you'll win
- How you make money, and how big this could be
- **Progress:** users, listings, sales, growth rate
- Founders: who builds what; a one-minute founder video
- About 40% of accepted companies are at the idea stage, but **vagueness gets you rejected**; acceptance is roughly 1.5–2%.

**How to frame this company for investors**

*Small story (weak):* "A marketplace for non-AI products."

*Big story (strong):* **"We're building the trust layer for human-made work."** The marketplace is the starting point. The valuable part is the verification system: disclosure, scanning, process evidence and the badge. Every listing makes that data better, and the badge spreads across the web. Later it becomes a service other platforms pay for (publishers, stock sites, print shops, schools).

**Why now:**
- The EU AI Act's labelling rules (Article 50) and California's AI Transparency Act both took effect 2 August 2026
- Bandcamp banned AI-generated music in January 2026
- At least eight competing "human-made" labels are racing for the standard, with no clear winner
- Mentioning AI in a product description measurably lowers purchase intent

**What they'll push on, so prepare answers:**
- *"Detectors don't work."* Agreed, and that's why our score is disclosure + evidence + scans, shown as a range. See `/standard`.
- *"Isn't this niche?"* Creative work is the wedge; verification is the platform.
- *"Can you get supply?"* Show the founding-creator numbers.
- *"Was this built with AI?"* Be upfront: yes, the software was built with AI-assisted development. The human-made promise is about the **works sold**, not the tooling. Say it before they ask.

**What to have before applying:** 50–100 real sellers, real listings (demo ones removed), first sales (even through Stage 0 payment links), and a week-over-week growth number. Also worth applying to: Indian programs like Peak XV's Surge, Antler India and 100X.VC (check current intake dates).

**Practical note:** YC invests in companies set up as US (Delaware) corporations and helps Indian founders with that move. Incorporating in the US first would also make Stripe easier. Ask a CA or lawyer before choosing where to register.

---

## 7. What's blocking us, in order

| # | Blocker | Fix | Who |
| --- | --- | --- | --- |
| 1 | Brand and domain | Buy unprompters.com, rename the site, connect it to Vercel | You buy it; I rename and connect |
| 2 | Legal pages | Terms, privacy, refund policy, contact page (Razorpay requires them) | I draft; a lawyer reviews |
| 3 | No way to pay | Stage 0 seller payment links now; Razorpay later | I build |
| 4 | SEO basics | Sitemap, share images, structured data, category pages | I build |
| 5 | Locked-out users | Password reset and email verification (needs an email service such as Resend) | I build; you create the account |
| 6 | Real files | Secure file uploads and downloads for deliverables (Supabase Storage) | I build |
| 7 | Demo listings | Hide or remove once real listings exist | I build a switch |
| 8 | No numbers | Privacy-friendly analytics (Vercel Analytics or Plausible) | I add |
| 9 | Business setup | Registration, current account, GST | You, with a CA |

## 8. The next 90 days

**Weeks 1–2: get ready**
- Domain live, name changed, legal pages, SEO basics, Stage 0 payments, analytics
- Make a list of 300 candidate creators

**Weeks 3–6: founding creators**
- Message 20–30 creators a day; aim for 100 signed up and 50 with real listings
- Publish the free "Does my writing look AI-generated?" tool
- One creator spotlight a week on Instagram and LinkedIn

**Weeks 7–12: first sales and a launch**
- Launch on Product Hunt and Show HN; pitch Indian startup press
- Register the business; Razorpay checkout (Stage 1)
- Track: active sellers, listings, visits, sales, weekly growth
- Apply to YC or Indian accelerators with real numbers

**What success looks like at day 90:** 100 founding creators, 200+ real listings, first 50 sales, and a clear weekly growth rate. That's a story an investor can say yes to.

---

## Sources

- YC application: [Causo guide](https://hub.causo.ai/guides/how-to-apply-to-yc-2026), [Flowjam](https://www.flowjam.com/blog/yc-application-tips-2025), [Leland](https://www.joinleland.com/library/a/yc-application)
- Payments: [Razorpay Route](https://razorpay.com/docs/payments/route/), [Route FAQs on RBI criteria](https://razorpay.com/docs/payments/route/faqs.md), [Stripe in India 2026](https://www.infinityapp.in/blog/stripe-review), [Stripe Connect alternatives for India](https://www.playto.so/blogs/best-stripe-connect-alternative-for-indian-platform-and-marketplace-businesses-in-2026), [Lemon Squeezy prohibited products](https://docs.lemonsqueezy.com/help/getting-started/prohibited-products), [Paddle: what you can't sell](https://paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle)
- Market: [Cara on Wikipedia](https://en.wikipedia.org/wiki/Cara_(app)), [TechCrunch on Cara](https://techcrunch.com/?p=2790719), [Fybe](https://fybe.art/), [Human Made Mark (Variety)](https://variety.com/2026/film/global/the-human-made-mark-ai-free-film-initiative-launches-1236728524/), [human premium in art (secondary)](https://emergent.sh/news/ai-creates-human-premium-art-it-last-2026)
- Marketplace cold start: [RaftLabs](https://www.raftlabs.com/blog/two-sided-marketplace-cold-start), [GrowthSpree](https://www.growthspreeofficial.com/blogs/marketplace-saas-go-to-market-b2b-2026)
- Earlier research (demand, detection, regulation): see [RESEARCH.md](RESEARCH.md)
