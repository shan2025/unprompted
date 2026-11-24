import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getMerchSales } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { isCompanyOwner } from "@/lib/merch";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { reviewShipment } from "@/app/actions/fulfillment";

export const metadata: Metadata = { title: "My merch analytics", robots: { index: false } };

export default function MerchPage() {
  return <Suspense fallback={<p className="p-6">Loading sales…</p>}><MerchReport /></Suspense>;
}

function Revenue({ totals }: { totals: Map<string, number> }) {
  if (!totals.size) return <>0</>;
  return <>{[...totals.entries()].map(([currency, cents]) => (
    <span key={currency} className="block">{formatMoney(cents, currency)}</span>
  ))}</>;
}

async function MerchReport() {
  const user = await requireUser("/admin/merch");
  if (!isCompanyOwner(user)) notFound();
  const report = await getMerchSales(user.id);
  const p = schema.payments;
  const shipments = await db.select({ id: p.id, status: p.fulfillment, title: schema.listings.title,
    stale: sql<boolean>`(${p.shipment}->>'claimedAt')::bigint < extract(epoch from now() - interval '10 minutes') * 1000` }).from(p)
    .innerJoin(schema.listings, eq(schema.listings.id, p.listingId))
    .where(and(eq(schema.listings.creatorId, user.id), eq(p.status, "paid"), isNotNull(p.fulfillment)))
    .orderBy(desc(p.id)).limit(100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="link text-sm">Dashboard</Link>
      <h1 className="mt-4 text-4xl font-light">My merch analytics</h1>
      <p className="mt-2 text-ink-soft">All-time Marketplace sales for the merchandise listed by your account.</p>
      <dl className="my-8 grid gap-5 border-y border-line py-5 sm:grid-cols-3">
        <div><dt className="text-sm">Confirmed sales</dt><dd className="mt-1 text-3xl tabular-nums">{report.confirmed}</dd></div>
        <div><dt className="text-sm">Confirmed revenue</dt><dd className="mt-1 text-3xl tabular-nums"><Revenue totals={report.revenue} /></dd></div>
        <div>
          <dt className="text-sm">Awaiting confirmation</dt>
          <dd className="mt-1 text-3xl tabular-nums">{report.pending}</dd>
          {report.pending > 0 && <Link href="/dashboard#pending-orders" className="link text-sm">Review payments</Link>}
        </div>
      </dl>
      <h2 className="text-xl font-medium">Sales by product</h2>
      {report.products.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted"><tr>
              <th scope="col" className="py-3">Product</th>
              <th scope="col" className="px-3 text-right">Confirmed sales</th>
              <th scope="col" className="text-right">Revenue</th>
            </tr></thead>
            <tbody>{report.products.map(product => (
              <tr key={product.slug} className="border-b border-line">
                <th scope="row" className="py-3 font-medium"><Link className="link" href={`/listing/${product.slug}`}>{product.title}</Link></th>
                <td className="px-3 text-right tabular-nums">{product.confirmed}</td>
                <td className="text-right tabular-nums"><Revenue totals={product.revenue} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-ink-soft">Your first product will appear here when you submit a listing with a Merchandise product type.{" "}
          <Link href="/sell" className="link">List your merch</Link>
        </p>
      )}
      <p className="mt-5 text-sm text-muted">Revenue uses the order amount in its original currency. A sale counts once payment is confirmed.</p>
      {shipments.length > 0 && <section className="mt-8">
        <h2 className="text-xl font-medium">Recent Qikink orders</h2>
        {shipments.map(s => <div key={s.id} className="border-b border-line py-3">
          <p>{s.title} · UNP{s.id}</p>
          <p className="text-sm text-muted">{{ waiting: "Waiting to send", submitting: "Submission in progress", sent: "Sent to Qikink", review: "Check this order in Qikink" }[s.status!]}</p>
          {s.status !== "sent" && <form action={reviewShipment} className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <input type="hidden" name="payment" value={s.id} />
            {s.status === "waiting" ? <button className="link" name="decision" value="send">Send order</button> : <>
              <label><input type="checkbox" name="checked" required /> I checked UNP{s.id} in Qikink.</label>
              <button className="link" name="decision" value="found">Already in Qikink</button>
              {(s.status === "review" || s.stale) &&
                <button className="link" name="decision" value="missing">Confirmed absent · retry</button>}
            </>}
          </form>}
        </div>)}
      </section>}
    </div>
  );
}
