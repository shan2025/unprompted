# Roadmap: where Unprompters stands on 10 November 2026, and the order to move in

*Written after a full review of the code and the live site. It replaces the "next 90 days" section of [GO-TO-MARKET.md](GO-TO-MARKET.md) as the working plan; the outreach scripts are still in [OUTREACH-KIT.md](OUTREACH-KIT.md). Dates are absolute. Nothing here is a promise to investors; it's the order we work in.*

## 1. Where we are

**The product works.** Type checks, lint and 111 unit tests pass. Every public page renders on desktop and on a 375px phone. Explore, Marketplace, Journal, profiles, posting with a score preview, video posts, Ask the creator, follows, comments, reports, the review queue, Google login, password reset, sitemap, share images and structured data are all live.

**The site is empty.** On unprompters.com today: two Journal posts (both by the founder), no other creators, nothing real for sale. The Marketplace still shows the ten demo listings by fictional creators, because `HIDE_DEMO_CONTENT` isn't set on Vercel. A visitor who clicks "Marketplace" sees made-up people. That's the first thing to change.

**Fixed in this review (10 November):**
- Home page example card said "2 items" of evidence and "No process evidence attached" at once.
- Score notes said "this listing" on Journal posts and video posts. They're now built from the score at render time, so old posts show the new wording too.
- The standard page, terms, privacy and contact pages were written for a marketplace only. They now cover posts, comments, follows, video links, Ask the creator and Google login.
- Profile pages had no description or canonical link and were titled only "@handle". They now carry the person's name and bio.
- Onboarding, Journal and README copy still said "listing" or "marketplace" where it meant any work.
- The go-to-market doc's "not built yet" list was six items out of date.

**Known gaps, not fixed, that need a decision (section 7):**
- Prices are in US dollars only, but sellers' payment links are UPI, Razorpay and Instamojo, which charge in rupees. A ₹500 UPI link under a "$25" price tag will confuse everyone. Needs a currency on each listing.
- The embeddable badge exists only for listings, not posts.
- No email verification, so any address can sign up.
- No notifications of any kind: a creator doesn't know someone followed, appreciated, commented or asked, except by email for questions and orders.
- No web app manifest, so the site can't be installed on a phone home screen.
- "Founding Unprompter" badge and home-page featured spots are promised in the outreach kit and don't exist.

## 2. Positioning: the answer to the slop problem

Andrej Karpathy's complaint, that YouTube has become hard to use because AI-generated content drowns out the real thing, is the demand signal for this company. People don't want an "AI detector". They want a feed where *made by a person* is the default, with enough proof that they can relax.

**One line:** *The feed where everything was made by a person, and you can see how.*

**What we are not:** anti-AI, a detector, or a certification body. We're transparent about AI (a percentage with a range, from disclosure + scan + evidence), and we're honest that detection can't settle it. That's defensible, and it lets AI-assisted creators join too.

**Three audiences, in order of how soon they pay off:**

| Audience | What they want | What we give them | How they find us |
| --- | --- | --- | --- |
| **Creators** tired of being called AI, or of being buried under slop | Proof, a home, an audience that cares | A page per work with process attached, a score, a badge, people who follow | Outreach (section 4), their own followers |
| **Explorers** who want human work | A feed they can trust | Explore, Journal, follow, categories, "Human-made only" filter | Creators sharing their links, SEO, launches, press |
| **Buyers**: gift buyers, collectors, and later brands and publishers | Provenance they can show someone | Marketplace, Ask the creator, licenses, evidence | From explorers; later a "commission a human" form |

**Why someone would come here instead of Instagram:** the proof is the enjoyable part of the page, not a compliance step. Every product decision should make "see how it was made" more satisfying.

**Global from day one, India as home base.** The site is English-language and the audience for this is worldwide (the anti-slop feeling is strongest in the US, UK and Europe). Payments, company registration and GST are Indian problems to solve on the Indian side; a US entity can come later if YC or Stripe require it.

## 3. The product shape: Instagram + Amazon + Substack, web first, apps after

You described it as an Instagram-like platform with everything in mobile apps, plus Amazon + Instagram + Substack in the browser. That maps cleanly onto what exists:

| Part | What it is here | Status |
| --- | --- | --- |
| Instagram (the feed) | Explore, Journal, profiles, follow, appreciate, comment | Built; needs notifications and a Following feed on the home page |
| Amazon (the store) | Marketplace, listings, licenses, payment links, orders | Built at Stage 0 (seller links); needs currency and, later, platform payments |
| Substack (writing + audience) | Journal articles, follow, the author's own page | Built; needs an email digest ("new from people you follow") and a creator's email list |

**Mobile: install first, native later.**
1. **Now (one week):** make the website installable. Add a web app manifest, make sure the icons, status bar and viewport are right, test on real phones. It then sits on a home screen with an icon and opens full screen. This is what most "apps" in this space actually are at launch, and it costs nothing in app-store review time.
2. **Months 4 to 6:** real iOS and Android apps with Expo (React Native), once there are enough people posting that push notifications matter. The apps need an API layer; today the site uses server actions, which only the website can call. Plan the API when building notifications, so it's reused by the apps.
3. **Don't** build native apps before the feed has daily new work. An empty app gets one-star reviews and never recovers.

## 4. Where the customers are: platforms to work, globally

Creators come from where people who *make things by hand* already gather and where the AI conversation is loudest. Explorers follow the creators. Work these in the order given; one or two at a time, properly, beats ten badly.

**Creators (supply), highest yield first**
1. **Bluesky.** The largest concentrated community of artists who left X and Instagram over AI. Custom feeds (search "no AI art", "traditional art", "sketchbook") list exactly the people to invite. Post daily; reply to artists; never cold-DM the same text twice.
2. **Cara.** Built for anti-AI artists; 650,000 users joined in a week in June 2026. Be present, don't poach; invite people to *also* post on Unprompters because of the proof page and the ability to sell.
3. **Instagram and Threads.** Hashtags `#noai`, `#humanmade`, `#traditionalart`, `#sketchbook`, `#instapoetry`, `#wip`, `#processvideo`, `#indianartist`. Process-video accounts with 500 to 20,000 followers reply most.
4. **Reddit** (read each sub's self-promotion rules first): r/ArtistLounge, r/learnart, r/Watercolor, r/Sketchbooks, r/writing, r/Poetry, r/OCPoetry, r/photography, r/analog, r/woodworking, r/pottery, r/knitting, r/crochet, r/Embroidery, r/Filmmakers, r/Shortfilms, r/WeAreTheMusicMakers, r/webdev and r/opensource for code. The "I got accused of using AI" threads that appear weekly in art and writing subs are the warmest leads on the internet.
5. **Platforms with an anti-AI or disclosure policy, whose users already care:** Bandcamp (banned AI music, January 2026), Newgrounds, Itch.io (disclosure required), Ravelry (fiber arts), Fybe (fiber marketplace), the Authors Guild "Human Authored" list, the Human Made Mark (film).
6. **Writers:** Substack Notes, Medium, Wattpad, writing Discords, NaNoWriMo-style groups; poets at open mics.
7. **Film and video:** small YouTube and Vimeo channels that post behind-the-scenes, film school student showcases, short-film festival entrants.
8. **Code:** GitHub profiles with hand-written READMEs, Show HN posters, dev.to and Hashnode writers who publish "how I built it" posts.
9. **In person (India first, because it's cheap):** fine-arts and design colleges, craft fairs, open mics, maker spaces. The outreach kit has the 30-second pitch and the college email.

**Explorers and buyers (demand)**
1. **Creators' own audiences.** Every creator who shares their Unprompters link brings their followers to the work itself. This is the cheapest channel we have, so make the share image and the badge beautiful.
2. **Launches:** Hacker News "Show HN" (the Karpathy angle lands here), Product Hunt, then Indian startup press (YourStory, Inc42) and the global tech press angle *"an Indian founder built the anti-slop feed"*. Launch only when there are 100+ real works, or the first comment will be "it's empty".
3. **Search:** the free "Does my writing look AI-generated?" tool (the analyser already exists; it needs a public page), plus the articles listed in the go-to-market doc. Slow, compounding, free.
4. **Curated newsletters and link blogs** that cover human craft and the web: Dense Discovery, Sidebar, Kottke, The Browser, Web Curios, Dirt, Garbage Day. One good mention each is worth a month of posting.
5. **Pinterest** for visual work (art, crafts, design): every work page with an image is pinnable, and Pinterest traffic is purchase-minded and lasts years.
6. **LinkedIn** for the business buyers later: brands, agencies and publishers who want human-made illustration and copy and proof to show their customers.
7. **Partnerships:** cross-link with notbyai.fyi, Human Made Mark, Fybe and Cara. We don't compete with labels; we're where labelled work lives and sells.

**The next AI controversy.** Cara's growth came from one news day. Keep the "leaving because your work is being used to train AI?" post drafted (it's in the outreach kit) and publish it within the hour.

## 5. Merchandise: when and how

You want to sell merchandise once there are customers. Two different things, with different timing:

| Line | What it is | Needs first | When |
| --- | --- | --- | --- |
| **Creator merchandise** | Prints, tees, mugs, notebooks of human-made art, made to order and shipped by a print-on-demand partner. The creator picks products and a margin; we add a fee. Every item carries the work's score and a link to its process. | Platform payments (Stage 1 in the go-to-market doc), a registered business, and at least a few hundred active buyers | After the first 50 sales through payment links |
| **Unprompters merchandise** | "Made by a human" tees, stickers, tote bags, sketchbooks with the thumbprint mark. Marketing more than revenue: creators wear them, photos go on social media. | A small budget and one supplier | Small batch for founding creators as a thank-you, once there are 100 |

**Suppliers to compare when the time comes:** Printful and Gelato (global, ship locally in most countries), Printify (cheapest, many printers), Qikink and Printrove (India, UPI and COD). Choose by where buyers are, not where we are.

**Don't** start merchandise before the feed is alive. It splits attention and each line needs the same payments and legal setup the marketplace already needs.

## 6. The flow we're building, and the order of work

The loop every week should feed:

```
seed the site with real work
  → invite creators by hand (20 a day)
    → they post, with process attached
      → they share their link (badge, share image)
        → their followers explore, follow, appreciate, ask
          → some buy, some commission, some post their own
            → more work on the site → easier invites
```

Every feature below is chosen because it tightens one arrow in that loop.

### Phase A: make the site worth sharing (10 November to 7 December 2026)

Product, in this order:
1. **Set `HIDE_DEMO_CONTENT=true` on Vercel** and redeploy. Ten minutes, and it stops fictional creators being the first thing people see. (Founder)
2. **Currency on listings.** A currency field (INR, USD, EUR, GBP to start) shown next to the price; payment links charge in the seller's currency. Without this, the first real sale goes wrong.
3. **Notifications by email.** New follower, new comment, new appreciation (batched daily), new question. Build it as a small internal API so the apps can reuse it later.
4. **Installable web app.** Manifest, icons, theme colour, tested on an iPhone and an Android phone.
5. **Following feed on the home page** for signed-in people, above "Recently shared".
6. **Founding Unprompter badge and featured spots.** A flag on the account, a mark on the profile and cards, and a "Featured" row on the home page that the moderator curates. Both are promised in the outreach kit.
7. **Badge for Journal posts** (the badge route takes a listing slug today).
8. **Email verification** before anyone can post, comment or ask.

People, in parallel:
- **Seed 25 to 30 real works** before any outreach: the founder's own, friends', anyone who says yes early. Every work with at least one process image.
- Build the list of 300 candidate creators (Bluesky and Instagram first) in `outreach-tracker.csv`.
- Finish the `hello@unprompters.com` mailbox if it isn't done.

**Done when:** 30 real works live, demo content hidden, notifications and currency shipped, site installs on a phone.

### Phase B: founding creators and the first launch (8 December 2026 to 15 February 2027)

- **Outreach at 20 messages a day**, following the outreach kit. Targets: 100 creators signed up, 50 with a real work posted, by 15 January.
- **Weekly creator spotlight** on Bluesky, Instagram and LinkedIn; weekly theme in the founding creators' group.
- **Ship the free "Does my writing look AI-generated?" page** and the four articles in the go-to-market doc, for search.
- **Category landing pages with real text** ("Human-made illustration", "Poetry written without AI").
- **Register the business, open a current account, GST, talk to a CA.** Then Razorpay checkout (Stage 1), so buyers pay on the site and sellers stop confirming payments by hand.
- **Launch:** Show HN and Product Hunt in the week of 2 February 2027, once there are 100+ works. Pitch YourStory and Inc42 the same week.
- **Measure, weekly:** creators with a work posted, works posted by people other than the founder, visits, returning visitors, follows, questions sent, sales, week-over-week growth.

**Done when:** 100 founding creators, 200+ real works, first 20 sales, a weekly growth number.

### Phase C: apps and money (16 February to 31 May 2027)

- **API layer** (the notifications work started it) and **Expo apps** for iOS and Android with push notifications. Same accounts, same feed.
- **"Commission a human"**: a request form on profiles for paid work, which is where brands and larger orders come from.
- **Collections and tags**, better search, "more like this".
- **Creator merchandise** (section 5) once platform payments and the first 50 sales are in.
- **Verified process review** as a paid option for creators who want a stronger badge.
- Apply to YC or Indian accelerators with real numbers (the go-to-market doc has the framing).

### Phase D: the trust layer (from June 2027)

- The badge and score as a service other platforms pay for: publishers, stock sites, print shops, schools.
- Proper C2PA signature verification, commercial detectors per medium, identity verification for sellers.
- Razorpay Route (automatic split payouts) once turnover passes the RBI thresholds.

## 7. Decisions needed from the founder

1. **Currency.** Rupees as the default with others allowed, or dollars as the default with rupees allowed? Recommendation: the seller chooses per listing from INR, USD, EUR, GBP, and the site shows the price in that currency with no conversion. Simple and honest.
2. **Demo content.** Hide it now (recommended), or delete the demo accounts for good. Hiding keeps the local demo working.
3. **Installable website first, native apps in Phase C** (recommended), or native apps sooner? Sooner means two to three months of building with no new creators, which is the one thing we can't afford.
4. **Business registration timing.** Everything in Phase B's money column waits on it. Starting the paperwork in November means Razorpay checkout is possible by February.
5. **Which three categories to feature first** on the home page and in spotlights, even though all twelve stay open. Recommendation from the research: illustration and art, poetry and writing, and short film.

## 8. What to track, and what good looks like

| Number | Week 1 of outreach | Day 90 | Where to read it |
| --- | --- | --- | --- |
| Creators with a real work posted | 5 | 100 | Admin query, later a dashboard |
| Works posted by people other than the founder | 10 | 200+ | Same |
| Weekly visitors, returning visitors | baseline | growing every week | Vercel Analytics |
| Follows, appreciations, questions sent | baseline | growing every week | Database |
| Sales (payment links, then checkout) | 0 | 20 to 50 | Dashboard |
| Week-over-week growth in works posted | n/a | a steady positive number | Spreadsheet |

If replies to outreach fall below 1 in 10, change the message before sending more. If people sign up and don't post, the problem is the posting flow, not the message; watch three people post over a call and fix what they trip on.
