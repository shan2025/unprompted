import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getMerchSales } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { isCompanyOwner } from "@/lib/merch";

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
      <p className="mt-5 text-sm text-muted">Revenue uses the order amount in its original currency. A sale counts when you confirm the buyer’s payment.</p>
    </div>
  );
}
