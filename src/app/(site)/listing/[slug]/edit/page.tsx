import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, ne } from "drizzle-orm";
import { DraftWorkspace } from "@/components/DraftWorkspace";
import { SellForm } from "@/components/SellForm";
import { requireUser } from "@/lib/auth";
import { getListing } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { isAutoEvidence } from "@/lib/post-form";
import type { EditableListing } from "@/lib/listing-form";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };
type Props = { params: Promise<{ slug: string }> };
export default function Page({ params }: Props) {
  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><h1 className="text-4xl font-light">Edit your listing</h1><div className="mt-8"><Suspense fallback={<p>Loading listing…</p>}><Editor params={params} /></Suspense></div></div>;
}
async function Editor({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/listing/${slug}/edit`);
  const row = await getListing(slug);
  if (!row || row.listing.creatorId !== user.id) notFound();
  const listing = row.listing;
  const [order] = await db.select({ id: schema.orders.id }).from(schema.orders).where(and(eq(schema.orders.listingId, listing.id), ne(schema.orders.status, "declined"))).limit(1);
  if (order || listing.status === "sold") return <p className="max-w-2xl text-ink-soft">This listing has orders, so its work and terms are protected for those buyers. You can withdraw it from the market on your dashboard, or <Link href="/sell" className="link">create a new listing</Link> for a new version.</p>;
  const editable = { ...listing, workVersion: listing.analysis.analyzedAt, evidence: listing.evidence.map((e, index) => ({ ...e, index })).filter((e) => !isAutoEvidence(e)) } as EditableListing;
  return <><p className="mb-6 max-w-2xl text-ink-soft">{listing.moderationReason || (listing.status === "removed" ? "This listing was removed. Your revision will return to a moderator before it can go live." : "Changes are assessed again. Any previous evidence review is cleared when you submit a new version.")}</p><DraftWorkspace userId={user.id} kind="listing" targetSlug={slug}><SellForm listing={editable} /></DraftWorkspace></>;
}
