import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import type { FeedItem } from "@/lib/feed";
import { formatPrice, formatShortDate } from "@/lib/format";
import { videoEmbed } from "@/lib/video";
import { Avatar } from "./Avatar";
import { Cover } from "./Cover";
import { LikeButton } from "./LikeButton";
import { CommentIcon } from "./PostCard";
import { AiPill } from "./Score";
import { ShareButton } from "./ShareButton";

// One piece in the phone home feed, full width, one after another as you
// scroll down. Videos play and writing reads right here; the title opens
// the full piece. Work for sale carries its price and a Buy button.

const ACTION =
  "-m-2 inline-flex items-center gap-1.5 p-2 text-ink transition-[scale] duration-150 ease-out [-webkit-tap-highlight-color:transparent] active:scale-90";

/** `liked`: whether the viewer has already appreciated this post. */
export function FeedPost({ item, liked = false }: { item: FeedItem; liked?: boolean }) {
  return item.kind === "post" ? <PostEntry post={item.post} liked={liked} /> : <ListingEntry listing={item.listing} />;
}

type Post = Extract<FeedItem, { kind: "post" }>["post"];
type Listing = Extract<FeedItem, { kind: "listing" }>["listing"];

function Shell({
  name,
  handle,
  avatarFile,
  date,
  aiPill,
  children,
}: {
  name: string;
  handle: string;
  avatarFile: string | null;
  date: Date;
  aiPill: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // A thick grey band between posts, so each one reads as its own card.
    <article className="border-t-8 border-field pb-3 first-of-type:border-t-0">
      <header className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <Link href={`/u/${handle}`} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={name} file={avatarFile} className="h-10 w-10 shrink-0 text-sm" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold text-ink">{name}</span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">{formatShortDate(date)}</span>
          </span>
        </Link>
        <span className="ml-auto shrink-0">{aiPill}</span>
      </header>
      {children}
    </article>
  );
}

function PostEntry({ post, liked }: { post: Post; liked: boolean }) {
  const href = `/journal/${post.slug}`;
  const video = post.videoUrl ? videoEmbed(post.videoUrl) : null;
  const hasPicture = Boolean(post.coverFile || post.coverTheme || post.coverPattern);
  const aiPill = <AiPill percent={post.aiPercent} tier={post.tier} verified={post.processVerified} unscanned={Boolean(video)} tinted />;
  const media = Boolean(video || hasPicture);
  // About 230 words a minute; only writing long enough to time gets a read time.
  const minutes = Math.ceil(post.words / 230);
  const kicker = post.words >= 100 ? `${categoryLabel(post.category)} · ${minutes} min read` : categoryLabel(post.category);
  const caption = (
    <Link href={href} className={`block px-4 text-[15px] leading-relaxed ${media ? "pt-1" : "pb-1"}`}>
      <h2 className={`font-medium text-ink ${media ? "text-base" : "text-xl leading-snug"}`}>{post.title}</h2>
      {post.excerpt && <p className={`mt-1 whitespace-pre-line text-ink-soft ${media ? "line-clamp-2" : "line-clamp-6"}`}>{post.excerpt}</p>}
      <span className="mt-1 inline-block text-sm text-muted">{video ? "Open" : "Read more"}</span>
    </Link>
  );

  return (
    <Shell
      name={post.authorName}
      handle={post.authorHandle}
      avatarFile={post.authorAvatarFile}
      date={post.createdAt}
      aiPill={aiPill}
    >
      {video ? (
        <div className="aspect-video bg-ink">
          <iframe
            src={video.src}
            title={post.title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : hasPicture ? (
        <StoryCard
          href={href}
          cover={<Cover slug={post.slug} category={post.category} coverFile={post.coverFile} theme={post.coverTheme} pattern={post.coverPattern} title={post.title} />}
          kicker={kicker}
          title={post.title}
          lines={post.excerpt}
        />
      ) : null}

      {/* Writing with no picture reads first, like a text post. A picture post carries its words on the card. */}
      {!media && caption}

      <div className="flex items-center gap-6 px-4 pt-3">
        <LikeButton slug={post.slug} liked={liked} count={post.appreciations} showCount className={ACTION} />
        <Link href={`${href}#comments`} aria-label={`Comments · ${post.comments}`} className={ACTION}>
          <CommentIcon className="h-6 w-6" />
          {post.comments > 0 && <span className="text-sm font-semibold tabular-nums">{post.comments}</span>}
        </Link>
        <ShareButton path={href} title={post.title} className={ACTION} />
      </div>

      {video && caption}
    </Shell>
  );
}

function ListingEntry({ listing }: { listing: Listing }) {
  const href = `/listing/${listing.slug}`;
  const forSale = listing.priceCents > 0 && listing.status !== "sold";
  const aiPill = <AiPill percent={listing.aiPercent} tier={listing.tier} verified={listing.processVerified} tinted />;

  return (
    <Shell name={listing.creatorName} handle={listing.creatorHandle} avatarFile={null} date={listing.createdAt} aiPill={aiPill}>
      <StoryCard
        href={href}
        cover={<Cover slug={listing.slug} category={listing.category} coverFile={listing.coverFile} theme={listing.coverTheme} pattern={listing.coverPattern} title={listing.title} />}
        kicker={categoryLabel(listing.category)}
        badge={listing.status === "sold" ? "Sold" : forSale ? "For sale" : "Free"}
        title={listing.title}
        lines={listing.summary}
      />

      <div className="flex items-center gap-5 px-4 pt-3">
        <ShareButton path={href} title={listing.title} className={ACTION} />
        {forSale && (
          <Link href={href} className="btn-primary ml-auto px-5 py-2.5">
            Buy · {formatPrice(listing.priceCents, listing.currency)}
          </Link>
        )}
      </div>
    </Shell>
  );
}

/**
 * The picture fills a rounded card and its lower half fades to dark, carrying
 * the craft, the title and the first lines, like a newsletter app's feed.
 * The whole card opens the piece.
 */
function StoryCard({
  href,
  cover,
  kicker,
  badge,
  title,
  lines,
}: {
  href: string;
  cover: React.ReactNode;
  kicker: string;
  badge?: string;
  title: string;
  lines?: string | null;
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
      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/50 to-transparent px-[18px] pb-[18px] pt-20 text-white">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/90">{kicker}</span>
        <h2 className="mt-1.5 text-balance text-[25px] font-extrabold leading-[1.16] tracking-[-0.02em]">{title}</h2>
        {lines && <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[15px] leading-snug text-white/90">{lines}</p>}
      </div>
    </Link>
  );
}
