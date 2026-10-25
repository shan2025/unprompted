import type { Metadata } from "next";
import Link from "next/link";
import { TierStamp } from "@/components/Score";
import { CATEGORIES, STAGE_WEIGHTS } from "@/lib/categories";
import { EVIDENCE_KINDS, LEVELS, LEVEL_INFO, MAX_DISCLOSED, STAGES, STAGE_INFO, TIER_INFO, type Tier } from "@/lib/scoring";

export const metadata: Metadata = {
  title: "How scoring works",
  description: "How Unprompted estimates AI involvement, what the number means, and what detection can't do.",
};

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-14 scroll-mt-8 text-3xl font-semibold">
      {children}
    </h2>
  );
}

export default function StandardPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow">The Unprompted standard</p>
      <h1 className="mt-2 text-5xl font-semibold leading-tight">How scoring works</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">
        Every listing carries an <strong className="text-ink">AI-involvement estimate</strong>: roughly how much of the
        creative work came from AI rather than from the person selling it. It comes with a range, a stage-by-stage
        breakdown, and the reasoning behind it. Here is exactly how it&apos;s built, and where it falls short.
      </p>

      <H2>What the tiers mean</H2>
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        {(Object.keys(TIER_INFO) as Tier[]).map((t) => (
          <div key={t} className="flex flex-wrap items-center gap-4 border-b border-line bg-card px-5 py-4 last:border-0">
            <div className="w-32">
              <TierStamp tier={t} />
            </div>
            <span className="w-16 font-semibold">{TIER_INFO[t].range}</span>
            <span className="flex-1 text-ink-soft">{TIER_INFO[t].blurb}</span>
          </div>
        ))}
      </div>

      <H2>1. The creator discloses, stage by stage</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          &ldquo;Did you use AI?&rdquo; is too blunt a question. A novelist who ran spellcheck and one who had a chatbot
          write chapter three both used AI. So creators answer separately for four stages:
        </p>
      </div>
      <ul className="mt-4 space-y-2">
        {STAGES.map((s) => (
          <li key={s} className="card px-4 py-3 text-sm">
            <strong>{STAGE_INFO[s].label}</strong> <span className="text-muted">· {STAGE_INFO[s].hint}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 leading-relaxed text-ink-soft">For each stage they pick a level:</p>
      <ul className="mt-3 space-y-2">
        {LEVELS.map((l) => (
          <li key={l} className="text-sm text-ink-soft">
            <strong className="text-ink">{LEVEL_INFO[l].label}</strong> ({Math.round(LEVEL_INFO[l].value * 100)}% of that
            stage): {LEVEL_INFO[l].hint}.
          </li>
        ))}
      </ul>
      <p className="mt-5 leading-relaxed text-ink-soft">
        Stages are weighted by what the buyer is paying for. In a poem the writing matters most. In an idea, the idea does.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Category</th>
              {STAGES.map((s) => (
                <th key={s} className="px-4 py-3 text-right font-semibold">
                  {STAGE_INFO[s].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium">{c.label}</td>
                {STAGES.map((s) => (
                  <td key={s} className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                    {Math.round(STAGE_WEIGHTS[c.id][s] * 100)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-5 leading-relaxed text-ink-soft">
        <strong className="text-ink">The disclosure is the floor.</strong> Nothing we detect can bring a score below what
        the creator admits to. New listings must disclose {Math.round(MAX_DISCLOSED * 100)}% AI or less.
      </p>

      <H2>2. We scan the work</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          <strong className="text-ink">Text and poetry</strong> are split into passages and checked for statistical habits
          of language models: stock vocabulary, formulaic constructions, very even sentence rhythm, stacked transition
          words. Each passage gets a probability, and the score is the share of the text that reads as machine-made. You
          can see the passage-level result on every listing.
        </p>
        <p>
          <strong className="text-ink">Code</strong> is checked for tutorial habits: comments that narrate every line,
          docstrings on everything, &ldquo;example usage&rdquo; blocks, emoji in log strings. Human tells like TODOs and
          commented-out experiments count the other way.
        </p>
        <p>
          <strong className="text-ink">Images</strong> are checked for what the file says about itself: generator names,
          IPTC &ldquo;trained algorithmic media&rdquo; tags, Stable Diffusion and ComfyUI parameters, and C2PA Content
          Credentials. A generator tag is strong evidence. No metadata means nothing; it gets stripped all the time.
        </p>
        <p>
          The private deliverable is scanned along with the public preview, but only the preview&apos;s results are shown.
          Scans can <strong className="text-ink">only raise</strong> a score above the disclosure, and only in proportion to
          how confident they are.
        </p>
      </div>

      <H2>3. Evidence narrows the range</H2>
      <p className="mt-4 leading-relaxed text-ink-soft">
        The best proof that a person made something is the process. Creators can attach evidence, which is shown publicly
        so anyone can check it:
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {Object.values(EVIDENCE_KINDS).map((e) => (
          <li key={e.label} className="card px-4 py-3 text-sm">
            {e.label}
            <span className="float-right text-muted">+{Math.round(e.strength * 100)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 leading-relaxed text-ink-soft">
        Strengths combine with diminishing returns, up to 90%. At 50% or more a listing is marked{" "}
        <strong className="text-human">Process verified</strong>. Evidence also softens detector suspicion. That&apos;s
        deliberate: a time-lapse of someone painting outweighs a pattern-matcher.
      </p>

      <H2 id="limits">What detection can&apos;t do</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>We want to be blunt about this, because a marketplace built on trust can&apos;t oversell its tools.</p>
        <p>
          <strong className="text-ink">AI detectors are unreliable.</strong> OpenAI withdrew its own text classifier in 2023
          because of its low accuracy. A peer-reviewed comparison of 14 detectors (Weber-Wulff et al., 2023) found none
          above 80% accuracy. Independent tests of commercial tools keep finding false-positive rates well above what
          vendors advertise, and higher still for people writing in a second language.
        </p>
        <p>
          <strong className="text-ink">They are easy to fool.</strong> Light paraphrasing, editing, or simply asking a model
          to write casually defeats most of them. Metadata can be stripped with a screenshot.
        </p>
        <p>
          <strong className="text-ink">So we never treat a scan as a verdict.</strong> Our built-in analyzer is a transparent
          baseline, and its confidence is capped. Every estimate is shown as a range. Disagreements between a scan and a
          disclosure go to a person.
        </p>
      </div>

      <H2 id="disputes">Reviews &amp; disputes</H2>
      <ul className="mt-4 list-inside list-disc space-y-2 leading-relaxed text-ink-soft">
        <li>
          If automated checks find substantially more AI than disclosed, the listing is held for review instead of going
          live. The creator sees why and can add evidence.
        </li>
        <li>Anyone signed in can report a listing. Reports go to moderators, never straight to removal.</li>
        <li>
          Moderators look at the evidence, not just the number. Misrepresenting AI use is grounds for removal; an honest
          disclosure never is.
        </li>
        <li>Creators can appeal any decision with additional process evidence.</li>
      </ul>

      <div className="mt-14 rounded-2xl bg-ink p-8 text-paper">
        <p className="font-display text-2xl font-semibold">Made something?</p>
        <p className="mt-2 text-paper/80">You&apos;ll see your score before anything is published.</p>
        <Link href="/sell" className="btn mt-5 bg-paper text-ink hover:bg-accent hover:text-accent-ink">
          Start a listing
        </Link>
      </div>
    </article>
  );
}
