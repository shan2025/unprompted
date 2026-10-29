import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { removeComment } from "@/app/actions/posts";
import { CommentForm } from "@/components/CommentForm";
import { Cover } from "@/components/Cover";
import { FlagForm } from "@/components/FlagForm";
import { ScoreCard } from "@/components/Score";
import { SegmentView } from "@/components/SegmentView";
import { AppreciateButton, FollowButton } from "@/components/Social";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/categories";
import { formatDate, plural } from "@/lib/format";
import { getPost, getPostActivity, isFollowing } from "@/lib/journal";
import { EVIDENCE_KINDS, TIER_INFO, type Tier } from "@/lib/scoring";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPost(slug);
  if (!row || row.post.status !== "published") return { title: "Journal" };
  return {
    title: row.post.title,
    description: `${row.post.aiPercent}% AI · ${TIER_INFO[row.post.tier as Tier]?.label}. ${row.post.body.slice(0, 200)}`,
  };
}

export default function PostPage(props: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Suspense fallback={<PostSkeleton />}>
        <PostView {...props} />
      </Suspense>
    </div>
  );
}

async function PostView({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const row = await getPost(slug);
  if (!row) notFound();

  const { post, author } = row;
  const user = await getCurrentUser();
  const isAuthor = user?.id === post.authorId;
  const isAdmin = user?.role === "admin";
  if (post.status !== "published" && !isAuthor && !isAdmin) notFound();

  const path = `/journal/${post.slug}`;
  const [activity, following] = await Promise.all([
    getPostActivity(post.id, user?.id ?? null),
    user && !isAuthor ? isFollowing(user.id, author.id) : Promise.resolve(false),
  ]);
  const { analysis, evidence } = post;
  const isPublished = post.status === "published";

  return (
    <>
      <Banner status={post.status} created={query.created === "1"} isAuthor={isAuthor} />

      <nav className="mb-4 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/journal" className="hover:text-ink">
          Journal
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/journal?category=${post.category}`} className="hover:text-ink">
          {categoryLabel(post.category)}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="min-w-0">
          <h1 className="text-4xl font-light leading-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-3 text-ink-soft">
            by{" "}
            <Link href={`/u/${author.handle}`} className="link font-semibold text-ink">
              {author.name}
            </Link>{" "}
            · {formatDate(post.createdAt)}
            {post.isDemo && <span className="ml-2 rounded bg-line/70 px-1.5 py-0.5 text-[11px] font-semibold text-muted">DEMO POST</span>}
          </p>

          {post.coverFile && (
            <div className="card mt-6 overflow-hidden">
              <Cover slug={post.slug} category={post.category} coverFile={post.coverFile} title={post.title} className="max-h-[560px]" />
            </div>
          )}

          {post.body && (
            <div className="mt-8 max-w-[68ch]">
              <SegmentView
                text={post.body}
                segments={analysis.previewSegments}
                kind={analysis.previewKind}
                textClass="text-[17px] leading-[1.75]"
              />
            </div>
          )}

          {/* On small screens the score follows the writing, so reading comes first. */}
          <div className="mt-10 lg:hidden">
            <ScoreCard score={analysis.score} evidenceCount={evidence.length} />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-y border-line py-4">
            <AppreciateButton slug={post.slug} count={activity.appreciations} appreciated={activity.appreciated} disabled={isAuthor || !isPublished} />
            <span className="text-sm text-muted">{plural(activity.comments.length, "comment")}</span>
          </div>

          {post.aiNotes && (
            <section className="mt-10">
              <h2 className="text-2xl font-normal">AI use, in the author&apos;s words</h2>
              <blockquote className="mt-4 border-l-2 border-accent pl-4 italic leading-relaxed text-ink-soft">{post.aiNotes}</blockquote>
            </section>
          )}

          {evidence.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-normal">Process evidence</h2>
              <ul className="mt-4 space-y-3">
                {evidence.map((e, i) => (
                  <li key={i} className="card flex flex-col gap-1 p-4">
                    <span className="text-sm font-semibold">{EVIDENCE_KINDS[e.kind]?.label ?? e.kind}</span>
                    {e.url && (
                      <a href={e.url} target="_blank" rel="nofollow ugc noopener noreferrer" className="link break-all text-sm text-ink-soft">
                        {e.url}
                      </a>
                    )}
                    {e.note && <span className="text-sm text-muted">{e.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12" id="comments">
            <h2 className="text-2xl font-normal">Comments</h2>
            {activity.comments.length === 0 && <p className="mt-3 text-ink-soft">No comments yet.</p>}
            <ul className="mt-4 space-y-4">
              {activity.comments.map((c) => (
                <li key={c.id} className="card p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <Link href={`/u/${c.authorHandle}`} className="font-semibold hover:text-accent">
                      {c.authorName}
                    </Link>
                    {c.authorId === post.authorId && <span className="text-xs font-semibold text-accent">Author</span>}
                    <span className="text-muted">· {formatDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-ink">{c.body}</p>
                  <div className="mt-2 flex items-center gap-4">
                    {user && (user.id === c.authorId || isAdmin) && (
                      <form action={removeComment}>
                        <input type="hidden" name="id" value={c.id} />
                        <SubmitButton className="text-xs font-medium text-muted hover:text-heavy" pendingText="Removing…">
                          Remove
                        </SubmitButton>
                      </form>
                    )}
                    {user && user.id !== c.authorId && <FlagForm target="comment" id={c.id} compact />}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!isPublished ? (
                <p className="text-sm text-muted">Comments open once the post is live.</p>
              ) : user ? (
                <CommentForm slug={post.slug} />
              ) : (
                <p className="text-ink-soft">
                  <Link href={`/login?next=${encodeURIComponent(`${path}#comments`)}`} className="link font-semibold text-ink">
                    Log in
                  </Link>{" "}
                  to join the conversation.
                </p>
              )}
            </div>
          </section>
        </article>

        <aside className="space-y-5">
          <div className="hidden lg:block">
            <ScoreCard score={analysis.score} evidenceCount={evidence.length} />
          </div>

          <div className="card p-5">
            <span className="eyebrow">Author</span>
            <Link href={`/u/${author.handle}`} className="mt-2 block font-display text-xl font-medium hover:text-accent">
              {author.name}
            </Link>
            <p className="text-sm text-muted">@{author.handle}</p>
            {author.bio && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{author.bio}</p>}
            {!isAuthor && (
              <div className="mt-4">
                <FollowButton handle={author.handle} following={following} returnTo={path} />
              </div>
            )}
          </div>

          <p className="px-1 text-xs leading-relaxed text-muted">
            Disclosed by the author: {analysis.score.disclosedPercent}%. Estimate after automated checks and evidence:{" "}
            {analysis.score.percent}%. Automated checks are signals, not proof.{" "}
            <Link href="/standard" className="link">
              How scoring works
            </Link>
          </p>

          {!isAuthor && user && (
            <div className="px-1">
              <FlagForm target="post" id={post.id} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Banner({ status, created, isAuthor }: { status: string; created: boolean; isAuthor: boolean }) {
  const banner = (tone: string, text: React.ReactNode) => (
    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tone}`} role="status">
      {text}
    </div>
  );
  if (status === "in_review") {
    return banner(
      "border-assist/40 bg-card text-ink",
      isAuthor ? (
        <>
          <strong>In review.</strong> Automated checks found more AI than you disclosed, so a moderator will look at this
          before it goes live. Adding process evidence helps.
        </>
      ) : (
        <>
          <strong>In review.</strong> Hidden from the Journal until a moderator decides.
        </>
      ),
    );
  }
  if (status === "removed") return banner("border-heavy/40 bg-card text-ink", <><strong>Removed.</strong> This post is no longer in the Journal.</>);
  if (created) return banner("border-human/40 bg-card text-ink", <><strong>Your post is live.</strong> Share the link, or keep writing.</>);
  return null;
}

function PostSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
      <div className="space-y-4">
        <div className="h-12 w-3/4 animate-pulse rounded bg-line/70" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-line/70" />
        <div className="h-64 animate-pulse rounded bg-line/50" />
      </div>
      <div className="card h-96 animate-pulse" />
    </div>
  );
}
