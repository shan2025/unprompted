import Link from "next/link";

/**
 * The picture fills a rounded card and its lower half fades to dark, carrying
 * the craft, the title and the first lines, like a newsletter app's feed.
 * The whole card opens the piece. Used by the phone home feed and Journal.
 */
export function StoryCard({
  href,
  cover,
  kicker,
  badge,
  title,
  lines,
  children,
}: {
  href: string;
  cover: React.ReactNode;
  kicker: string;
  badge?: string;
  title: string;
  lines?: string | null;
  /** Extra marks laid over the picture, such as a play badge. */
  children?: React.ReactNode;
}) {
  return (
    // Arbitrary radius: the theme's radius tokens are all square.
    <Link
      href={href}
      className="relative mx-4 block aspect-[20/19] overflow-hidden rounded-[14px] bg-ink transition-[scale] duration-200 ease-out [-webkit-tap-highlight-color:transparent] active:scale-[0.99]"
    >
      <div className="absolute inset-0">{cover}</div>
      {badge && (
        <span className="absolute left-3.5 top-3.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-md">
          {badge}
        </span>
      )}
      {children}
      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/50 to-transparent px-[18px] pb-[18px] pt-20 text-white">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/90">{kicker}</span>
        <h2 className="mt-1.5 text-balance text-[25px] font-extrabold leading-[1.16] tracking-[-0.02em]">{title}</h2>
        {lines && <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[15px] leading-snug text-white/90">{lines}</p>}
      </div>
    </Link>
  );
}
