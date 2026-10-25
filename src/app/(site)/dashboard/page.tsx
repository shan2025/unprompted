import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AiPill } from "@/components/Score";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/data";
import { formatDate, formatPrice } from "@/lib/format";

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
  const data = await getDashboard(user.id);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-1 text-4xl font-light">Hi, {user.name.split(" ")[0]}</h1>
          <Link href={`/u/${user.handle}`} className="link mt-1 inline-block text-sm text-ink-soft">
            View your public profile
          </Link>
        </div>
        <Link href="/sell" className="btn-primary">
          New listing
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Listings" value={data.listings.length.toString()} />
        <Stat label="Sales" value={data.sales.count.toString()} />
        <Stat label="Earned (demo)" value={formatPrice(data.sales.totalCents)} />
      </div>

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
          <div className="card mt-4 overflow-x-auto">
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
        <h2 className="text-2xl font-normal">Your purchases</h2>
        {data.purchases.length === 0 ? (
          <p className="mt-3 text-ink-soft">
            Nothing yet.{" "}
            <Link href="/explore" className="link font-semibold text-ink">
              Explore the market
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
