import type { CSSProperties, ReactNode } from "react";
import { Cover } from "@/components/Cover";

type Props = {
  title: string;
  subtitle: string;
  coverSlug: string;
  coverCategory: string;
  panelHeading: string;
  panelPoints: string[];
  children: ReactNode;
};

/** Split auth layout: a tall drawn cover with a short pitch beside the form. */
export function AuthShell({ title, subtitle, coverSlug, coverCategory, panelHeading, panelPoints, children }: Props) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-6.5rem)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-16">
      <aside className="intro-open cv-play relative hidden overflow-hidden lg:block">
        <Cover slug={coverSlug} category={coverCategory as never} palette={0} title="" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-10 pt-32 text-white">
          <p className="text-3xl font-light leading-tight">{panelHeading}</p>
          <ul className="mt-6 space-y-2 text-sm text-white/85">
            {panelPoints.map((p) => (
              <li key={p} className="flex gap-3">
                <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-white/70" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-sm">
          <div className="intro-open cv-play mb-8 h-20 overflow-hidden lg:hidden">
            <Cover slug={coverSlug} category={coverCategory as never} palette={0} title="" className="h-full" />
          </div>
          <h1 className="intro-rise text-4xl font-light tracking-tight" style={{ "--d": "150ms" } as CSSProperties}>
            {title}
          </h1>
          <p className="intro-rise mt-3 text-ink-soft" style={{ "--d": "230ms" } as CSSProperties}>
            {subtitle}
          </p>
          <div className="intro-rise mt-10" style={{ "--d": "310ms" } as CSSProperties}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
