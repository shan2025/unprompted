import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { WritingCheck } from "@/components/WritingCheck";
import { siteUrl } from "@/lib/format";
import { breadcrumbs } from "@/lib/structured-data";
import { WRITING_CHECK_PATH } from "@/lib/writing-check";

const TITLE = "Does my writing look AI-generated?";
const DESCRIPTION =
  "A free check for writers. Paste your writing and see which passages carry the patterns AI detectors look for, and why. It runs in your browser: nothing is uploaded.";

export const metadata: Metadata = {
  title: `${TITLE} Free check`,
  description: DESCRIPTION,
  alternates: { canonical: WRITING_CHECK_PATH },
  openGraph: { siteName: "Unprompters", title: TITLE, description: DESCRIPTION, type: "website", url: WRITING_CHECK_PATH },
};

// The same questions are shown on the page and given to search engines and AI tools.
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is this an AI detector?",
    a: "Not in the sense of giving a verdict. It looks for habits of style that are common in AI text, such as stock phrases, formula sentences and very even rhythm, and shows you where they appear. It can't tell who or what wrote the words, and no tool can.",
  },
  {
    q: "A passage was flagged. Does that mean I used AI?",
    a: "No. People write this way too, especially in formal, academic or business writing, and when writing in a second language. A flag means a detector is more likely to react to that passage, not that a machine wrote it.",
  },
  {
    q: "Nothing was flagged. Does that prove I wrote it?",
    a: "No. AI text that has been edited, or that was asked for in a casual voice, often shows none of these patterns. A clean result only means the usual habits are missing.",
  },
  {
    q: "Is my text stored or used to train anything?",
    a: "No. The check runs inside your browser. Your text is not sent to Unprompters, saved, or used for training.",
  },
  {
    q: "Why does my own writing get flagged by AI detectors?",
    a: "Detectors react to predictable, polished, evenly paced prose, and careful human writers produce exactly that. Independent studies have found that detectors wrongly flag human writing, and do so more often for people writing in a second language.",
  },
  {
    q: "How can I prove I wrote something?",
    a: "With your process, not with a detector. Keep your drafts, notes and version history. On Unprompters you can share a piece with that evidence attached, so anyone can see how it was made.",
  },
];

// Section headings rise in as they scroll into view.
function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <Reveal className="mt-14">
      <h2 id={id} className="scroll-mt-8 text-3xl font-light">
        {children}
      </h2>
    </Reveal>
  );
}

// Stagger delay for the intro animations in globals.css.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function WritingCheckPage() {
  const url = `${siteUrl()}${WRITING_CHECK_PATH}`;
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: TITLE,
              url,
              description: DESCRIPTION,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Any",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@id": `${siteUrl()}/#organization` },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
            },
            breadcrumbs([{ name: "AI writing check", path: WRITING_CHECK_PATH }]),
          ],
        }}
      />

      <p className="eyebrow intro-rise">Free tool</p>
      <h1 className="intro-rise mt-2 text-4xl font-light leading-tight sm:text-5xl" style={d(80)}>
        {TITLE}
      </h1>
      <p className="intro-rise mt-5 text-lg leading-relaxed text-ink-soft" style={d(180)}>
        Paste your writing and see which passages carry the patterns AI detectors look for, and why. It is free, needs no
        account, and runs in your browser, so nothing you paste is uploaded.
      </p>

      <div className="intro-rise mt-8" style={d(260)}>
        <WritingCheck />
      </div>

      <H2>What it looks for</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          The check splits your writing into passages and looks at each one for habits that are common in text written by
          language models:
        </p>
      </div>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft">
        <li>
          <strong className="text-ink">Stock vocabulary</strong>: words and phrases models overuse, such as &ldquo;delve&rdquo;,
          &ldquo;tapestry&rdquo; and &ldquo;it&apos;s important to note&rdquo;.
        </li>
        <li>
          <strong className="text-ink">Formula sentences</strong>: set constructions like &ldquo;it&apos;s not just X, it&apos;s Y&rdquo;
          or an opening &ldquo;In today&apos;s&hellip;&rdquo;.
        </li>
        <li>
          <strong className="text-ink">Transition stacking</strong>: sentence after sentence starting with &ldquo;Moreover&rdquo;,
          &ldquo;Additionally&rdquo; or &ldquo;Ultimately&rdquo;.
        </li>
        <li>
          <strong className="text-ink">Even rhythm</strong>: sentences that are all about the same length.
        </li>
        <li>
          <strong className="text-ink">In poems</strong>: stock imagery, very uniform lines and strict rhyming couplets.
        </li>
      </ul>
      <p className="mt-4 leading-relaxed text-ink-soft">
        Casual, uneven, personal writing counts the other way. It is the same analyzer Unprompters runs on every post and
        listing, and <Link href="/standard" className="link text-ink">the full method is public</Link>.
      </p>

      <H2 id="limits">What it can&apos;t tell you</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          <strong className="text-ink">It can&apos;t tell you who wrote something.</strong> Nothing can. OpenAI withdrew its
          own AI text classifier in 2023 because of its low accuracy, and a peer-reviewed comparison of 14 detectors
          (Weber-Wulff et al., 2023) found none above 80% accuracy.
        </p>
        <p>
          <strong className="text-ink">It gets people wrong in both directions.</strong> Careful, formal human writing can
          be flagged. AI text that has been lightly edited, or asked for in a casual voice, can pass.
        </p>
        <p>
          <strong className="text-ink">So treat the result as a mirror, not a verdict.</strong> It shows you what a
          detector is likely to react to. It is not evidence for or against anyone, and it should never be used to accuse
          a student, a colleague or a writer.
        </p>
      </div>

      <H2>If you&apos;ve been wrongly accused</H2>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft">
        <li>
          <strong className="text-ink">Show your process.</strong> Drafts, notes, outlines and version history (Google
          Docs keeps one automatically) are far stronger than any detector score.
        </li>
        <li>
          <strong className="text-ink">Ask which tool was used and what it reported.</strong> A detector score is a guess
          about style. On its own it is not proof of anything.
        </li>
        <li>
          <strong className="text-ink">Keep working the way you do.</strong> You don&apos;t have to change how you write to
          satisfy a detector. From now on, keep your drafts.
        </li>
      </ul>

      <H2 id="questions">Questions</H2>
      <dl className="mt-4 divide-y divide-line border-y border-line">
        {FAQ.map((item) => (
          <div key={item.q} className="py-5">
            <dt className="font-medium text-ink">{item.q}</dt>
            <dd className="mt-2 leading-relaxed text-ink-soft">{item.a}</dd>
          </div>
        ))}
      </dl>

      <Reveal className="mt-14 bg-ink p-8 text-paper">
        <p className="font-display text-2xl font-normal">A place where your process counts.</p>
        <p className="mt-2 max-w-xl leading-relaxed text-paper/80">
          Unprompters is a place to explore work made by people. Every piece shows how it was made and how much AI was
          involved.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/explore" className="btn bg-paper text-ink hover:bg-paper/85">
            Explore the work
          </Link>
          <Link href="/about" className="btn border border-paper/40 text-paper hover:bg-paper/10">
            About Unprompters
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
