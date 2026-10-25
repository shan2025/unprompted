# Research: will a marketplace for human-made work succeed?

*October 2026. Desk research to decide whether to build Unprompted and how. Survey figures are directional: samples, sponsors and question wording vary a lot between sources.*

## Short answer

**There's real demand, but the "% AI" number can't be a measurement. It has to be an estimate with a range.** Build it, but:

1. Sell **trust and transparency**, not detection. No tool can reliably say a work is "8% AI". What we *can* do is combine the creator's own disclosure, automated signals and process evidence into an honest estimate with a range, and show our reasoning.
2. **Start narrow.** "Sell anything" is the long-term vision. A two-sided marketplace launches on one community that cares a lot.
3. **Make process evidence the core of the product.** It's the one signal that holds up when detectors fail.

## 1. Is there demand for human-made work?

**Mostly yes, with caveats.**

- **Mentioning AI hurts trust.** A Washington State University study (1,000+ US adults, *Journal of Hospitality Marketing & Management*, 2024) found that putting "artificial intelligence" in a product description lowered purchase intent, through lower emotional trust. The effect was strongest for high-risk purchases. ([WSU](https://news.wsu.edu/press-release/2024/07/30/using-the-term-artificial-intelligence-in-product-descriptions-reduces-purchase-intentions/))
- **People say they'd pay more.** A 2026 paper found 72.9% of respondents willing to pay more for human-made creative work. ([arXiv 2604.15324](https://arxiv.org/pdf/2604.15324))
- **But stated preference ≠ spending.** In an IZA study of 650+ people, about 40% said they'd pay less for an AI-written story, yet behaviour (time and money spent) barely changed with the label. ([IZA](https://newsroom.iza.org/en/archive/opinion/ai-bias-for-creative-writing)) Incentivised auction experiments are under way. ([AEA registry](https://www.socialscienceregistry.org/trials/14469))
- **Preference is rising, unevenly.** Ipsos data shows US preference for human-created content rose from 2023 to 2025 ([eMarketer](https://www.emarketer.com/content/humans-still-win-content-race)). 36% say AI video lowers brand trust ([Animoto, Jan 2026](https://www.businesswire.com/news/home/20260121875037/en/83-of-Consumers-Can-Spot-AI-Videos-36-Say-It-Lowers-Brand-Trust-According-to-Animotos-New-Report)). Meanwhile other surveys show growing acceptance of AI media for entertainment ([Alvarez & Marsal, Mar 2026](https://www.alvarezandmarsal.com/press-release/alvarez-marsal-study-consumers-widely-accept-ai-created-and-curated-media)).

**Takeaway:** the premium is strongest where buyers care about authorship, meaning art, writing, music and craft, and weakest for utilitarian goods. Your hypothesis that human-made work will gain value is plausible for creative work. It's unproven for "anything".

## 2. Is anyone already doing this?

**Lots of labels, no clear marketplace.**

- **At least eight organisations** are racing to create a universal "human-made" mark ([BBC via PhotoWorkout](https://www.photoworkout.com/?p=218124), [Sigmalive](https://en.sigmalive.com/global-push-for-human-made-certification-grows/)). Vetting ranges from free self-download badges (notbyai.fyi, ai-free.io) to audited certification.
- **Authors Guild "Human Authored"**: opened to all US authors in March 2026, $10/title for non-members, 5,000+ titles certified. It allows spellcheck, research and outlining help, and runs on an honour code plus identity verification. ([Publishers Weekly](https://www.publishersweekly.com/pw/print/20260309/99836-authors-guild-opens-human-authored-certification-to-all-u-s-authors-and-publishers.html))
- **Film and TV**: "The Human Made Mark" launched April 2026 ([Señal News](https://senalnews.com/en/content/the-human-made-mark-launches-global-certification-to-champion-human-creativity-in-film-and-tv/amp)). **Music**: Humanable is expanding its certification ([MusicRow](https://musicrow.com/2026/03/humanable-expands-ai-free-certification-process/)).
- **Platforms are taking sides.** Bandcamp banned music made "wholly or in substantial part" by AI in January 2026, enforced through user reports ([Hypebot](https://www.hypebot.com/hypebot/2026/01/bandcamp-bans-ai-music.html)).

**The gap:** certifiers verify but don't sell, and marketplaces sell but don't verify. A marketplace with transparent, graded scoring (not a binary badge) is open ground. Experts quoted in that coverage argue that **AI use is a spectrum** and binary labels mislead. That supports showing a percentage with a breakdown.

## 3. Can we actually detect AI and show "8% AI"? (The critical question)

**Not reliably. This is the biggest risk in the idea.**

- OpenAI shut down its own AI-text classifier in 2023 because of its low accuracy. ([OpenAI](https://openai.com/index/new-ai-classifier-for-indicating-ai-written-text/))
- A peer-reviewed test of 14 detectors found none above 80% accuracy ([Weber-Wulff et al., 2023](https://arxiv.org/abs/2306.15666)). Detectors flag non-native English writers far more often ([Liang et al., 2023](https://arxiv.org/abs/2304.02819)).
- 2026 vendor claims (99%+) don't survive independent testing. Real-world GPTZero accuracy is around 82–87%, with false-positive estimates from 1% to 10% depending on the benchmark ([review roundup](https://fast.io/resources/ai-detector-accuracy-comparison-2026/), [benchmark](https://poignantguide.net/ai-detector-benchmark/)).
- Paraphrasing or light editing defeats most detectors. Image metadata gets stripped by screenshots and uploads.
- **Provenance is improving.** C2PA Content Credentials now ship in cameras (Leica, Nikon, Sony, Canon's May 2026 system) and phones (the Pixel 10 signs every photo by default). Platforms still strip them. ([Canon](https://www.canon-europe.com/press-centre/press-releases/2026/05/canon-introduces-c2pa-compliant-authenticity-imaging-system-for-news-organisations/), [overview](https://softwareseni.com/c2pa-adoption-in-2026-hardware-platforms-and-verification-reality))

**What this means for the design:**

| Naive version | What we built instead |
| --- | --- |
| Detector says "13% AI" | Estimate built from disclosure + detection + evidence, shown as **13% (likely 6–25%)** |
| Detector can lower or raise a score | Creator's disclosure is the **floor**; detection can only raise it, scaled by confidence |
| Flagged = guilty | Disagreement goes to **human review**; creators can add evidence and appeal |
| One number | **Stage-by-stage breakdown** (idea / making / polish / assets) |
| Trust the tool | **Public methodology page** that says plainly what detection can't do |

A false "40% AI" on someone's genuine work damages their income and invites legal claims. Framing every score as an estimate, with a range and an appeals path, is both more honest and less risky.

## 4. Regulation helps

- **EU AI Act Article 50** transparency obligations took effect 2 August 2026. Generative AI providers must mark AI output in machine-readable form, with fines up to €15M or 3% of turnover. ([Baker Botts](https://www.bakerbotts.com/thought-leadership/publications/2026/september/eu-ai-act-article-50-transparency-obligations-go-live))
- **California AI Transparency Act (SB 942, amended by AB 853)** also took effect 2 August 2026. Large generative AI providers must embed watermarks and offer free detection tools, for images, video and audio but not text. ([National Law Review](https://natlawreview.com/article/californias-ongoing-ai-regulation-key-deadlines-arriving-2026-and-beyond))

More AI output will carry machine-readable marks, which makes our metadata scanning more useful over time. These laws mostly bind AI providers, not marketplaces, but they normalise disclosure, which is the behaviour we're asking creators for.

## 5. Things to keep in mind

**Product**
- **Cold start.** Pick one launch community (suggestion: illustrators and writers, who are the most motivated and have natural process evidence: sketches, time-lapses, draft history). Add code, music and ideas once there's trust.
- **Process evidence is the moat.** Next steps: verify C2PA signatures properly (the open-source `c2pa` libraries), add a "record your process" tool (writing editor with revision history, screen-recording upload), and accept Authors Guild Human Authored certificates.
- **Define "no AI" clearly.** Follow the Authors Guild line: spellcheck and grammar are fine, research and brainstorming are disclosed but don't disqualify. The stage-by-stage disclosure already does this.
- **Selling ideas** is legally weak. Ideas aren't copyrightable, and once a buyer reads one it's out. Use teaser plus locked content, exclusive transfer and clear terms, and set expectations.

**Legal and money**
- Use a payments platform built for marketplaces (Stripe Connect handles seller onboarding, KYC and payouts), or a merchant-of-record (Paddle, Lemon Squeezy) to offload sales tax and VAT on digital goods.
- Terms of service: scores are estimates, not certification; misrepresentation is grounds for removal; dispute process; DMCA/copyright takedown agent; refund policy for digital goods.
- Privacy: you'll hold creators' unpublished work. Encrypt at rest and never train on it (say so publicly; it's a selling point).

**Trust and abuse**
- People *will* lie on disclosures. Detection plus community reports plus human review plus visible evidence is the deterrent. Track creator reputation over time.
- Expect brigading (mass false reports against rivals). Reports go to moderators, never straight to removal; this is built in.
- **Be upfront that the platform itself uses software tooling, including AI-assisted development.** The "human-made" claim is about the *listed works*. Critics will ask.

**Business model ideas**
- Commission per sale (typical marketplaces take 5–15%).
- Paid "Verified process" review for creators who want a stronger badge.
- Badge embeds (already built) as free marketing: every badge on a creator's site links back.

## Recommendation

Go, with three adjustments to the original idea:
1. Position as **"transparent about AI"**, not "AI detector". The number is an estimate with reasoning, never a verdict.
2. Launch with **one or two creative categories**, then expand.
3. Before taking real money: real payments, identity verification for sellers, at least one commercial detector per medium, proper C2PA verification, and legal review of terms.
