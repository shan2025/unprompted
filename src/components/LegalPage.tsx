import { SITE } from "@/lib/site";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-5xl font-light">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {SITE.lastUpdated}</p>
      <div className="mt-8 text-lg leading-relaxed text-ink-soft">{intro}</div>
      <div className="legal mt-4 leading-relaxed text-ink-soft">{children}</div>
    </article>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-8">
      <h2 className="text-2xl font-normal text-ink">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
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
