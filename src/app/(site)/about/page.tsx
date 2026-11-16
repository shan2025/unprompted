import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Reveal } from "@/components/Reveal";
import { siteUrl } from "@/lib/format";
import { MAX_DISCLOSED } from "@/lib/scoring";
import { SITE } from "@/lib/site";
import { breadcrumbs, organization } from "@/lib/structured-data";
import { WRITING_CHECK_PATH } from "@/lib/writing-check";

const DESCRIPTION =
  "Unprompters is a place to explore, share and buy work made by people, where every piece shows how it was made and how much AI was involved. Who runs it and why.";

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { siteName: "Unprompters", title: "About Unprompters", description: DESCRIPTION, type: "website", url: "/about" },
};

// Section headings rise in as they scroll into view.
function H2({ children }: { children: React.ReactNode }) {
  return (
    <Reveal className="mt-14">
      <h2 className="text-3xl font-light">{children}</h2>
    </Reveal>
  );
}

// Stagger delay for the intro animations in globals.css.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const WAYS = [
  {
    title: "Explore",
    body: "Read, watch and look at writing, art, film, music, code and handicrafts. No account needed.",
    href: "/explore",
    link: "Explore the work",
  },
  {
    title: "Share",
    body: "Post what you make, with your drafts, sketches or footage attached. It doesn't have to be for sale.",
    href: "/journal/new",
    link: "Share your work",
  },
  {
    title: "Buy and sell",
    body: "Buy a piece from the person who made it, or ask a creator whether something is for sale.",
    href: "/marketplace",
    link: "See the marketplace",
  },
];

export default function AboutPage() {
  const base = siteUrl();
  const founderUrl = `${base}/u/${SITE.founderHandle}`;
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "AboutPage", name: "About Unprompters", url: `${base}/about`, description: DESCRIPTION, mainEntity: { "@id": `${base}/#organization` } },
            { ...organization(), email: SITE.contactEmail, founder: { "@type": "Person", name: SITE.founderName, url: founderUrl } },
            breadcrumbs([{ name: "About", path: "/about" }]),
          ],
        }}
      />

      <p className="eyebrow intro-rise">About</p>
      <h1 className="intro-rise mt-2 text-4xl font-light leading-tight sm:text-5xl" style={d(80)}>
        Work made by people. See how it was made.
      </h1>
      <p className="intro-rise mt-5 text-lg leading-relaxed text-ink-soft" style={d(180)}>
        Unprompters is a place to explore, share and buy things people make themselves: writing, poetry, art,
        photography, design, music, film, code and handicrafts. Every piece shows how it was made and how much AI was
        involved.
      </p>

      <H2>Why it exists</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          It has become hard to tell what a person made. Feeds fill up with generated text, images and video, and the
          people who do make things by hand are now asked to prove it, often by a detector that can&apos;t.
        </p>
        <p>
          Unprompters is built for both sides of that problem. If you want to read, watch or buy human work, everything
          here says plainly how it was made. If you make things, your work gets a page that shows your process, not just
          the result.
        </p>
      </div>

      <H2>What you can do here</H2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {WAYS.map((way, i) => (
          <li key={way.title}>
            <Reveal delay={i * 90} className="card flex h-full flex-col p-5">
              <h3 className="text-xl font-normal">{way.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{way.body}</p>
              <Link href={way.href} className="link mt-4 text-sm text-ink">
                {way.link}
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>

      <H2>Honest about AI, not against it</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          AI use isn&apos;t a yes or a no. Someone who ran a spellcheck and someone who had a chatbot write a chapter both
          &ldquo;used AI&rdquo;. So creators say where it touched the work: the idea, the making, the polish, the extras.
          That disclosure, together with automated scans, becomes the score on every piece.
        </p>
        <p>A few rules we hold ourselves to:</p>
      </div>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft">
        <li>
          <strong className="text-ink">The creator&apos;s disclosure is the floor.</strong> We never show less AI than a
          creator admits to, and new work must disclose {Math.round(MAX_DISCLOSED * 100)}% AI or less.
        </li>
        <li>
          <strong className="text-ink">A scan is never a verdict.</strong> AI detectors get fooled and wrongly flag real
          people, so a scan can raise a score but can&apos;t convict anyone.
        </li>
        <li>
          <strong className="text-ink">Process is public.</strong> Drafts, time-lapses and version history sit on the
          page, where anyone can look.
        </li>
        <li>
          <strong className="text-ink">Disagreements go to a person.</strong> Reports and disputes are read by a
          moderator, and creators can answer with evidence.
        </li>
      </ul>
      <p className="mt-4 leading-relaxed text-ink-soft">
        The whole method, including where it falls short, is on{" "}
        <Link href="/standard" className="link text-ink">
          How scoring works
        </Link>
        . Writers can also try the same check on their own text with the free{" "}
        <Link href={WRITING_CHECK_PATH} className="link text-ink">
          AI writing check
        </Link>
        .
      </p>

      <H2>Who runs it</H2>
      <div className="prose-ink mt-4 leading-relaxed text-ink-soft">
        <p>
          Unprompters is an independent project, started in {SITE.started} and run by its founder,{" "}
          <Link href={`/u/${SITE.founderHandle}`} className="link text-ink">
            {SITE.founderName}
          </Link>
          , in India. The site carries no advertising. Buyers pay sellers directly, and Unprompters doesn&apos;t handle or
          hold the money.
        </p>
        <p>
          One thing we&apos;d rather say than have you wonder about: the software behind this site was built with
          AI-assisted tools. The promise here is about the work people share, not the code that displays it.
        </p>
      </div>

      <H2>Get in touch</H2>
      <p className="mt-4 leading-relaxed text-ink-soft">
        Questions, ideas, press, or something on the site that doesn&apos;t look right: email{" "}
        <a href={`mailto:${SITE.contactEmail}`} className="link text-ink">
          {SITE.contactEmail}
        </a>
        . More ways to reach us are on the{" "}
        <Link href="/contact" className="link text-ink">
          contact page
        </Link>
        .
      </p>

      <Reveal className="mt-14 bg-ink p-8 text-paper">
        <p className="font-display text-2xl font-normal">Made something?</p>
        <p className="mt-2 text-paper/80">Share it or sell it. You&apos;ll see your score before anything is published.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/journal/new" className="btn bg-paper text-ink hover:bg-paper/85">
            Share your work
          </Link>
          <Link href="/explore" className="btn border border-paper/40 text-paper hover:bg-paper/10">
            Explore the work
          </Link>
        </div>
      </Reveal>
    </article>
  );
}
