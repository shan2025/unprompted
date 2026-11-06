import type { Metadata } from "next";
import Link from "next/link";
import { reviewOrder } from "@/app/actions/listings";
import { LogoutButton } from "@/components/LogoutButton";
import { Suspense } from "react";
import { AiPill } from "@/components/Score";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { getDashboard, getInquiries } from "@/lib/data";
import { formatDate, formatMoney, formatPrice } from "@/lib/format";
import { getMyPosts } from "@/lib/journal";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: "Live", tone: "text-human" },
  in_review: { label: "In review", tone: "text-assist" },
  sold: { label: "Sold", tone: "text-ink" },
  removed: { label: "Removed", tone: "text-heavy" },
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
  const [data, posts, questions] = await Promise.all([getDashboard(user.id), getMyPosts(user.id), getInquiries(user.id)]);
  // Someone here only to explore gets their account and purchases, not selling tools.
  const creator = data.listings.length > 0 || posts.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{creator ? "Dashboard" : "Your account"}</p>
          <h1 className="mt-1 text-4xl font-light">Hi, {user.name.split(" ")[0]}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
            <Link href={`/u/${user.handle}`} className="link">
              View your public profile
            </Link>
            {user.role === "admin" && (
              <Link href="/admin" className="link">
                Review queue
              </Link>
            )}
            <LogoutButton className="link text-ink-soft hover:text-ink" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {creator ? (
            <>
              <Link href="/journal/new" className="btn-ghost">
                Share your work
              </Link>
              <Link href="/sell" className="btn-primary">
                New listing
              </Link>
            </>
          ) : (
            <Link href="/explore" className="btn-primary">
              Explore the work
            </Link>
          )}
        </div>
      </div>

      {creator && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Listings" value={data.listings.length.toString()} />
          <Stat label="Sales" value={data.sales.count.toString()} />
          <Stat label="Earned" value={formatMoney(data.sales.totalCents)} />
        </div>
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
                    {formatPrice(o.amountCents)} from{" "}
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
        <>
      <section className="mt-12">
        <h2 className="text-2xl font-normal">Your listings</h2>
        {data.listings.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-ink-soft">
            You haven&apos;t listed anything yet.{" "}
            <Link href="/sell" className="link font-semibold text-ink">
              List your first work
            </Link>
          </p>
        ) : (
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
                    <td className="px-4 py-3 text-right">{formatPrice(l.priceCents)}</td>
                    <td className="px-4 py-3 text-right">{l.sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-normal">Your journal posts</h2>
        {posts.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-ink-soft">
            Not everything has to be for sale.{" "}
            <Link href="/journal/new" className="link font-semibold text-ink">
              Share your first post
            </Link>
          </p>
        ) : (
          <div className="card mt-4 overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">AI</th>
                  <th className="px-4 py-3 text-right font-semibold">Appreciations</th>
                  <th className="px-4 py-3 text-right font-semibold">Comments</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/journal/${p.slug}`} className="font-semibold hover:text-accent">
                        {p.title}
                      </Link>
                      <div className="text-xs text-muted">{formatDate(p.createdAt)}</div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${STATUS[p.status]?.tone}`}>{STATUS[p.status]?.label ?? p.status}</td>
                    <td className="px-4 py-3">
                      <AiPill percent={p.aiPercent} tier={p.tier} />
                    </td>
                    <td className="px-4 py-3 text-right">{p.appreciations}</td>
                    <td className="px-4 py-3 text-right">{p.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}

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
                  <span className="text-sm font-semibold">{formatPrice(p.amountCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <span className="eyebrow">{label}</span>
      <span className="mt-1 block font-display text-3xl font-light">{value}</span>
    </div>
  );
}
