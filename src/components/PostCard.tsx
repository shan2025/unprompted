import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { PostCard as PostCardData } from "@/lib/journal";
import { Cover } from "./Cover";
import { AiPill } from "./Score";

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group card flex flex-col overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgb(60_40_20/0.25)]"
    >
      {post.coverFile && (
        <div className="aspect-[16/9] overflow-hidden border-b border-line">
          <Cover slug={post.slug} category={post.category} coverFile={post.coverFile} title={post.title} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="eyebrow">{categoryLabel(post.category)}</span>
          {post.isDemo && <span className="rounded bg-line/70 px-1.5 text-[10px] font-semibold text-muted">DEMO</span>}
        </div>
        <h3 className="mt-1.5 text-xl font-medium leading-snug text-ink group-hover:text-accent">{post.title}</h3>
        {post.excerpt && (
          <p className={`mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft ${post.coverFile ? "line-clamp-2" : "line-clamp-5"}`}>
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto pt-4">
          <p className="text-sm text-muted">
            {post.authorName} · {formatDate(post.createdAt)}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-ink-soft">
            <AiPill percent={post.aiPercent} tier={post.tier} verified={post.processVerified} />
            <span className="ml-auto inline-flex items-center gap-1" title="Appreciations">
              <HeartIcon className="h-3.5 w-3.5" />
              {post.appreciations}
              <span className="sr-only">appreciations</span>
            </span>
            <span className="inline-flex items-center gap-1" title="Comments">
              <CommentIcon className="h-3.5 w-3.5" />
              {post.comments}
              <span className="sr-only">comments</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function PostGrid({ posts }: { posts: PostCardData[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading posts">
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
