import type { Metadata } from "next";
import Link from "next/link";
import { reviewOrder } from "@/app/actions/listings";
import { Suspense } from "react";
import { Avatar } from "@/components/Avatar";
import { Cover } from "@/components/Cover";
import { CountUp } from "@/components/CountUp";
import { CommentIcon, HeartIcon } from "@/components/PostCard";
import { AiPill } from "@/components/Score";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { getDashboard, getInquiries } from "@/lib/data";
import { formatDate, formatMoney, formatPrice, formatShortDate } from "@/lib/format";
import { getCreatorStats, getMyPosts, getRecentActivity } from "@/lib/journal";
import { videoEmbed } from "@/lib/video";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: "Live", tone: "text-human" },
  in_review: { label: "In review", tone: "text-assist" },
  sold: { label: "Sold", tone: "text-ink" },
  removed: { label: "Removed", tone: "text-heavy" },
};

// Posts only show a status when it isn't the usual "Live".
const POST_STATUS: Record<string, { label: string; tone: string }> = {
  in_review: { label: "In review", tone: "bg-[#faeeda] text-assist" },
  removed: { label: "Removed", tone: "bg-[#f7e1de] text-heavy" },
};

const STAT_COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "",
  4: "lg:grid-cols-[1.4fr_1fr_1fr_1fr]",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="card h-96 animate-pulse" />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const user = await requireUser("/dashboard");
  const [data, posts, questions, stats, activity] = await Promise.all([
    getDashboard(user.id),
    getMyPosts(user.id),
    getInquiries(user.id),
    getCreatorStats(user.id),
    getRecentActivity(user.id),
  ]);
  const sharer = posts.length > 0;
  const seller = data.listings.length > 0;
  // Someone here only to explore gets their account and purchases, not creator tools.
  const creator = sharer || seller;
  const total = (key: "views" | "appreciations" | "comments") => posts.reduce((n, p) => n + p[key], 0);

  // Stats show what this person actually does: sharing numbers once they've
  // shared, and sales numbers only once they've listed something.
  const statCards: React.ReactNode[] = [];
  if (sharer) {
    statCards.push(
      <Stat key="views" label="Views" value={total("views")} change={stats.thisWeek.views} index={0}>
        <Spark days={stats.lastSevenDays} />
      </Stat>,
      <Stat key="works" label="Works shared" value={posts.length} index={1} />,
      <Stat key="appreciations" label="Appreciations" value={total("appreciations")} change={stats.thisWeek.appreciations} index={2} />,
      <Stat key="comments" label="Comments" value={total("comments")} change={stats.thisWeek.comments} index={3} />,
    );
  }
  if (seller) {
    const at = statCards.length;
    statCards.push(
      <Stat key="sales" label="Sales" value={data.sales.count} index={at} />,
      // One figure per currency sold in, largest first. Nothing sold yet shows nothing earned.
      <Stat
        key="earned"
        label="Earned"
        value={data.sales.totals[0]?.cents ?? 0}
        money={data.sales.totals[0]?.currency ?? "INR"}
        extra={data.sales.totals.slice(1).map((t) => formatMoney(t.cents, t.currency))}
        index={at + 1}
      />,
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="intro-rise text-4xl font-light">Hi, {user.name.split(" ")[0]}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
            <Link href={`/u/${user.handle}`} className="link">
              View your public profile
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="link">
                Review queue
              </Link>
            )}
          </div>
        </div>
        {!creator && (
          <Link href="/explore" className="btn-primary">
            Explore the work
          </Link>
        )}
      </div>

      {statCards.length > 0 && (
        <div className={`mt-8 grid gap-4 sm:grid-cols-2 ${STAT_COLUMNS[statCards.length] ?? "lg:grid-cols-3"}`}>{statCards}</div>
      )}

      {data.waiting.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-normal">Orders waiting for you</h2>
          <p className="mt-1 text-sm text-ink-soft">Check the money arrived before you mark an order as paid. That unlocks the work for the buyer, and it can&apos;t be undone.</p>
          <ul className="mt-4 space-y-3">
            {data.waiting.map((o) => (
              <li key={o.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link href={`/listing/${o.slug}`} className="font-semibold hover:text-accent">
                    {o.title}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {formatPrice(o.amountCents, o.currency)} from{" "}
                    <Link href={`/u/${o.buyerHandle}`} className="link">
                      {o.buyerName}
                    </Link>{" "}
                    · {formatDate(o.createdAt)}
                  </p>
                  <p className="mt-1 break-words text-sm text-ink-soft">
                    Payment reference: <strong className="text-ink">{o.reference}</strong>
                  </p>
                </div>
                <form action={reviewOrder} className="flex items-center gap-3">
                  <input type="hidden" name="id" value={o.id} />
                  <SubmitButton className="btn-primary px-5 py-2" name="decision" value="paid" pendingText="Saving…">
                    Mark as paid
                  </SubmitButton>
                  <SubmitButton className="btn-ghost px-5 py-2" name="decision" value="declined" pendingText="Saving…">
                    Decline
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {questions.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-normal">Questions about your work</h2>
          <p className="mt-1 text-sm text-ink-soft">People who asked agreed to share their email address with you. If you reply, they&apos;ll see yours too.</p>
          <ul className="mt-4 space-y-3">
            {questions.map((q) => {
              const title = q.listingTitle ?? q.postTitle ?? "your work";
              const href = q.listingSlug ? `/listing/${q.listingSlug}` : `/journal/${q.postSlug}`;
              return (
                <li key={q.id} className="card p-4">
                  <p className="text-sm text-ink-soft">
                    <Link href={`/u/${q.senderHandle}`} className="link">
                      {q.senderName}
                    </Link>{" "}
                    asked about{" "}
                    <Link href={href} className="font-semibold text-ink hover:text-accent">
                      {title}
                    </Link>{" "}
                    · {formatDate(q.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-ink">{q.message}</p>
                  <a href={`mailto:${q.senderEmail}?subject=${encodeURIComponent(`About ${title}`)}`} className="link mt-2 inline-block text-sm">
                    Reply to {q.senderEmail}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {creator && (
        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-normal">Your work</h2>
              <Link href="/journal/new" className="link text-sm">
                Share new work
              </Link>
            </div>
            {posts.length === 0 ? (
              <p className="mt-4 border-y border-line py-6 text-ink-soft">
                Not everything has to be for sale.{" "}
                <Link href="/journal/new" className="link font-semibold text-ink">
                  Share your first post
                </Link>
              </p>
            ) : (
              <ul className="mt-4 border-b border-line">
                {posts.map((p, i) => (
                  <WorkRow key={p.id} post={p} index={i} />
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0">
            <h2 className="text-2xl font-normal">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="mt-4 border border-line p-5 text-sm leading-relaxed text-ink-soft">
                When people comment on or appreciate your work, you&apos;ll see it here.
              </p>
            ) : (
              <ul className="card mt-4">
                {activity.map((a, i) => (
                  <li key={i} className="flex gap-3 border-b border-line p-4 text-sm leading-snug last:border-0">
                    <Link href={`/u/${a.handle}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
                      <Avatar name={a.name} file={a.avatarFile} className="h-8 w-8 text-xs" />
                    </Link>
                    <div className="min-w-0">
                      <p className="text-ink-soft">
                        <Link href={`/u/${a.handle}`} className="font-semibold text-ink hover:text-accent">
                          {a.name}
                        </Link>{" "}
                        {a.kind === "comment" ? "commented on" : "appreciated"}{" "}
                        <Link href={`/journal/${a.slug}${a.kind === "comment" ? "#comments" : ""}`} className="font-medium text-ink hover:text-accent">
                          {a.title}
                        </Link>
                      </p>
                      {a.body && <p className="mt-1 line-clamp-2 break-words text-ink-soft">&ldquo;{a.body}&rdquo;</p>}
                      <p className="mt-1 text-xs text-muted">{timeAgo(a.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {creator &&
        (seller ? (
          <section className="mt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-normal">Your listings</h2>
              <Link href="/sell" className="link text-sm">
                New listing
              </Link>
            </div>
            <div className="card mt-4 overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">AI</th>
                    <th className="px-4 py-3 text-right font-semibold">Price</th>
                    <th className="px-4 py-3 text-right font-semibold">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.map((l) => (
                    <tr key={l.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/listing/${l.slug}`} className="font-semibold hover:text-accent">
                          {l.title}
                        </Link>
                        <div className="text-xs text-muted">{formatDate(l.createdAt)}</div>
                      </td>
                      <td className={`px-4 py-3 font-semibold ${STATUS[l.status]?.tone}`}>{STATUS[l.status]?.label ?? l.status}</td>
                      <td className="px-4 py-3">
                        <AiPill percent={l.aiPercent} tier={l.tier} />
                      </td>
                      <td className="px-4 py-3 text-right">{formatPrice(l.priceCents, l.currency)}</td>
                      <td className="px-4 py-3 text-right">{l.sales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <p className="mt-12 flex flex-wrap items-center justify-between gap-2 border-y border-line py-5 text-ink-soft">
            <span>
              <span className="font-medium text-ink">Want to sell something?</span> List a piece in the marketplace and set your own price.
            </span>
            <Link href="/sell" className="link text-ink">
              Create a listing
            </Link>
          </p>
        ))}

      <section className="mt-12">
        <h2 className="text-2xl font-normal">Your purchases</h2>
        {data.purchases.length === 0 ? (
          <p className="mt-3 text-ink-soft">
            Nothing yet.{" "}
            <Link href="/explore" className="link font-semibold text-ink">
              Explore the work
            </Link>
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.purchases.map((p) => (
              <li key={p.slug}>
                <Link href={`/listing/${p.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-ink">
                  <span>
                    <span className="block font-semibold">{p.title}</span>
                    <span className="text-xs text-muted">
                      by {p.creatorName} · {formatDate(p.createdAt)}
                    </span>
                    {p.status === "pending" && <span className="block text-xs font-semibold text-assist">Waiting for the seller to confirm</span>}
                    {p.status === "declined" && <span className="block text-xs font-semibold text-heavy">Payment not confirmed</span>}
                  </span>
                  <span className="text-sm font-semibold">{formatPrice(p.amountCents, p.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

type MyPost = Awaited<ReturnType<typeof getMyPosts>>[number];

// Thumbnails draw themselves in on load, one after another (.cv-play in globals.css).
function WorkRow({ post: p, index }: { post: MyPost; index: number }) {
  const video = p.videoUrl ? videoEmbed(p.videoUrl) : null;
  const status = POST_STATUS[p.status];
  return (
    <li className="flex items-center gap-4 border-t border-line py-3.5">
      <Link href={`/journal/${p.slug}`} tabIndex={-1} aria-hidden="true" className="cv-play hidden h-16 w-[88px] shrink-0 overflow-hidden bg-field sm:block"
        style={{ "--d": `${Math.min(index, 8) * 120}ms` } as React.CSSProperties}
      >
        {!p.coverFile && video?.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnails come straight from the video's host
          <img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <Cover slug={p.slug} category={p.category} coverFile={p.coverFile} theme={p.coverTheme} pattern={p.coverPattern} title="" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/journal/${p.slug}`} className="font-medium hover:text-accent">
          {p.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
          {formatShortDate(p.createdAt)}
          <AiPill percent={p.aiPercent} tier={p.tier} />
          {status && <span className={`rounded-full px-2 py-0.5 font-semibold ${status.tone}`}>{status.label}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1" title="Views">
          <EyeIcon className="h-3.5 w-3.5" />
          {p.views.toLocaleString("en-US")}
          <span className="sr-only">views</span>
        </span>
        <span className="inline-flex items-center gap-1" title="Appreciations">
          <HeartIcon className="h-3.5 w-3.5" />
          {p.appreciations}
          <span className="sr-only">appreciations</span>
        </span>
        <span className="inline-flex items-center gap-1" title="Comments">
          <CommentIcon className="h-3.5 w-3.5" />
          {p.comments}
          <span className="sr-only">comments</span>
        </span>
      </div>
    </li>
  );
}

// Each tile rises in after the one before it, and its number counts up.
function Stat({
  label,
  value,
  money,
  extra = [],
  index = 0,
  change,
  children,
}: {
  label: string;
  value: number;
  /** A currency code makes `value` an amount in cents in that currency. */
  money?: string;
  /** Further amounts shown under the number, such as totals in other currencies. */
  extra?: string[];
  index?: number;
  change?: number;
  children?: React.ReactNode;
}) {
  const delay = index * 90;
  return (
    <div
      className="intro-rise card flex justify-between gap-4 p-5 [&>:last-child:not(:first-child)]:self-end"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <div>
        <span className="eyebrow">{label}</span>
        <span className="mt-1 block font-display text-3xl font-light tabular-nums">
          <CountUp to={value} delay={delay + 250} format={money ? "money" : "number"} currency={money} />
        </span>
        {extra.length > 0 && <span className="mt-0.5 block text-sm text-ink-soft tabular-nums">+ {extra.join(" + ")}</span>}
        {change !== undefined && (
          <span className={`mt-0.5 block text-xs font-semibold ${change > 0 ? "text-human" : "text-muted"}`}>
            {change > 0 ? `+${change.toLocaleString("en-US")}` : "None"} this week
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Views per day for the last seven days, today darkest. */
function Spark({ days }: { days: { day: string; views: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.views));
  return (
    <div className="flex h-10 items-end gap-[3px]" role="img" aria-label={`Views over the last 7 days: ${days.map((d) => d.views).join(", ")}`}>
      {days.map((d, i) => (
        <span
          key={d.day}
          title={`${d.day}: ${d.views} ${d.views === 1 ? "view" : "views"}`}
          className={`bar-grow block w-[7px] ${i === days.length - 1 ? "bg-ink" : "bg-line"}`}
          style={{ height: `${Math.max(8, (d.views / max) * 100)}%`, "--d": `${400 + i * 70}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function timeAgo(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatShortDate(date);
}
