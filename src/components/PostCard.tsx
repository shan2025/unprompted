import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import { formatShortDate } from "@/lib/format";
import type { PostCard as PostCardData } from "@/lib/journal";
import { videoEmbed } from "@/lib/video";
import { Avatar } from "./Avatar";
import { Cover } from "./Cover";
import { PostOwnerMenu } from "./PostOwnerMenu";
import { Reveal } from "./Reveal";
import { AiPill } from "./Score";

/** About how long a piece takes to read, at 220 words a minute. */
function readingTime(words: number) {
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/** With `ownerReturnTo`, the author sees a menu to edit or delete the post; deleting comes back to that page. */
export function PostCard({ post, ownerReturnTo }: { post: PostCardData; ownerReturnTo?: string }) {
  if (!ownerReturnTo) return <PostCardLink post={post} />;
  return (
    <div className="relative flex flex-col">
      <PostCardLink post={post} />
      <PostOwnerMenu slug={post.slug} title={post.title} returnTo={ownerReturnTo} />
    </div>
  );
}

function PostCardLink({ post }: { post: PostCardData }) {
  const video = post.videoUrl ? videoEmbed(post.videoUrl) : null;
  // A chosen cover theme or pattern gives a post without an image a generated cover.
  const hasPicture = Boolean(post.coverFile || video || post.coverTheme || post.coverPattern);
  const aiPill = <AiPill percent={post.aiPercent} tier={post.tier} verified={post.processVerified} unscanned={Boolean(video)} />;
  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group card flex flex-col overflow-hidden max-sm:border-x-0 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgb(60_40_20/0.25)]"
    >
      {hasPicture && (
        <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
          {!post.coverFile && video?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- thumbnails come straight from the video's host
            <img src={video.thumbnail} alt={post.title} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <Cover slug={post.slug} category={post.category} coverFile={post.coverFile} theme={post.coverTheme} pattern={post.coverPattern} title={post.title} />
          )}
          {/* The AI score sits on the picture so it's seen while scanning the grid. */}
          <span className="absolute left-3 top-3 rounded-full bg-card/95 px-2.5 py-1">{aiPill}</span>
          {video && <PlayBadge />}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="eyebrow">{categoryLabel(post.category)}</span>
          {post.isDemo && <span className="rounded bg-line/70 px-1.5 text-[10px] font-semibold text-muted">DEMO</span>}
          <span className="ml-auto text-xs font-medium text-muted">{video ? "Video" : post.words > 0 ? readingTime(post.words) : null}</span>
        </div>
        <h3 className="mt-1.5 text-xl font-medium leading-snug text-ink group-hover:text-accent">{post.title}</h3>
        {post.excerpt && (
          <p className={`mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft ${hasPicture ? "line-clamp-2" : "line-clamp-5"}`}>
            {post.excerpt}
          </p>
        )}
        {!hasPicture && <div className="mt-3">{aiPill}</div>}
        <div className="mt-auto flex items-center gap-2 pt-4 text-sm text-ink-soft">
          <Avatar name={post.authorName} file={post.authorAvatarFile} className="h-6 w-6 shrink-0 text-[11px]" />
          <span className="min-w-0 truncate">
            {post.authorName} <span className="text-muted">· {formatShortDate(post.createdAt)}</span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold" title="Appreciations">
            <HeartIcon className="h-3.5 w-3.5" />
            {post.appreciations}
            <span className="sr-only">appreciations</span>
          </span>
          <span className="ml-2 inline-flex shrink-0 items-center gap-1 text-xs font-semibold" title="Comments">
            <CommentIcon className="h-3.5 w-3.5" />
            {post.comments}
            <span className="sr-only">comments</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function PlayBadge() {
  return (
    <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/85 text-paper" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
    </span>
  );
}

/** `reveal` staggers each card in as it scrolls into view. */
export function PostGrid({ posts, reveal = false }: { posts: PostCardData[]; reveal?: boolean }) {
  return (
    <div className="grid gap-3 max-sm:-mx-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {posts.map((p, i) =>
        reveal ? (
          <Reveal key={p.id} delay={(i % 3) * 90} className="grid">
            <PostCard post={p} />
          </Reveal>
        ) : (
          <PostCard key={p.id} post={p} />
        ),
      )}
    </div>
  );
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 max-sm:-mx-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3" aria-busy="true" aria-label="Loading posts">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <div className="h-3 w-16 animate-pulse rounded bg-line/70" />
          <div className="h-6 w-3/4 animate-pulse rounded bg-line/70" />
          <div className="h-16 animate-pulse rounded bg-line/50" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-line/70" />
        </div>
      ))}
    </div>
  );
}

export function HeartIcon({ className = "h-4 w-4", filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.4 3.2 5 6.6 5c2 0 3.4 1.1 4.4 2.6C12 6.1 13.4 5 15.4 5c3.4 0 5.3 3.4 3.8 6.4C19 15.6 12 20 12 20z" strokeLinejoin="round" />
    </svg>
  );
}

export function CommentIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4V5z" strokeLinejoin="round" />
    </svg>
  );
}
