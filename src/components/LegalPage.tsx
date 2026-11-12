import { SITE } from "@/lib/site";
import { Reveal } from "./Reveal";

// Stagger delay for the intro animations in globals.css.
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

// The heading block rises in on load; each section rises in as it scrolls into view.
export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <p className="eyebrow intro-rise">{eyebrow}</p>
      <h1 className="intro-rise mt-3 text-5xl font-light" style={d(80)}>
        {title}
      </h1>
      <p className="intro-rise mt-3 text-sm text-muted" style={d(150)}>
        Last updated {SITE.lastUpdated}
      </p>
      <div className="intro-rise mt-8 text-lg leading-relaxed text-ink-soft" style={d(220)}>
        {intro}
      </div>
      <div className="legal mt-4 leading-relaxed text-ink-soft">{children}</div>
    </article>
  );
}

// The section keeps its id, so links to #anchors still land on it.
export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-8">
      <Reveal>
        <h2 className="text-2xl font-normal text-ink">{title}</h2>
        <div className="mt-4 space-y-4">{children}</div>
      </Reveal>
    </section>
  );
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export function ContactLine() {
  return (
    <a href={`mailto:${SITE.contactEmail}`} className="link text-ink">
      {SITE.contactEmail}
    </a>
  );
}
