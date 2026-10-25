import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { resolveFlag, reviewListing } from "@/app/actions/admin";
import { AiPill } from "@/components/Score";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { getReviewQueue } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { EVIDENCE_KINDS } from "@/lib/scoring";

export const metadata: Metadata = { title: "Review queue" };

const REASONS: Record<string, string> = {
  "undisclosed-ai": "Undisclosed AI use",
  stolen: "Not the seller's work",
  misleading: "Misleading listing",
  other: "Something else",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Moderation</p>
      <h1 className="mt-1 text-4xl font-semibold">Review queue</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Listings land here when automated checks disagree with the creator&apos;s disclosure, or when someone reports them.
        Look at the evidence, not just the number.
      </p>
      <Suspense fallback={<div className="card mt-8 h-64 animate-pulse" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  await requireAdmin();
  const { pending, openFlags } = await getReviewQueue();

  return (
    <>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Listings awaiting review ({pending.length})</h2>
        {pending.length === 0 && <p className="mt-3 text-ink-soft">Nothing waiting.</p>}
        <ul className="mt-4 space-y-4">
          {pending.map(({ listing, creatorName, creatorHandle }) => {
            const s = listing.analysis.score;
            return (
              <li key={listing.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/listing/${listing.slug}`} className="font-display text-xl font-semibold hover:text-accent">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted">
                      by {creatorName} (@{creatorHandle}) · {formatDate(listing.createdAt)}
                    </p>
                  </div>
                  <AiPill percent={listing.aiPercent} tier={listing.tier} verified={listing.processVerified} />
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  Disclosed <strong className="text-ink">{s.disclosedPercent}%</strong>, estimate{" "}
                  <strong className="text-ink">{s.percent}%</strong>, detector disagreement{" "}
                  <strong className="text-ink">{s.discrepancy} pts</strong>.
                </p>
                {listing.analysis.signals.length > 0 && (
                  <p className="mt-1 text-sm text-muted">Signals: {listing.analysis.signals.join("; ")}</p>
                )}
                {listing.analysis.media && (
                  <p className="mt-1 text-sm text-muted">Metadata: {listing.analysis.media.findings.join(" ")}</p>
                )}
                <p className="mt-1 text-sm text-muted">
                  Evidence:{" "}
                  {listing.evidence.length
                    ? listing.evidence.map((e) => EVIDENCE_KINDS[e.kind]?.label ?? e.kind).join(", ")
                    : "none"}
                </p>
                <form action={reviewListing} className="mt-4 flex gap-2">
                  <input type="hidden" name="id" value={listing.id} />
                  <SubmitButton name="decision" value="approve" className="btn-primary">
                    Approve
                  </SubmitButton>
                  <SubmitButton name="decision" value="remove" className="btn-ghost">
                    Remove
                  </SubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Open reports ({openFlags.length})</h2>
        {openFlags.length === 0 && <p className="mt-3 text-ink-soft">No open reports.</p>}
        <ul className="mt-4 space-y-4">
          {openFlags.map((f) => (
            <li key={f.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/listing/${f.listingSlug}`} className="font-semibold hover:text-accent">
                    {f.listingTitle}
                  </Link>
                  <p className="text-sm text-muted">
                    {REASONS[f.reason]} · reported by @{f.reporter} · {formatDate(f.createdAt)}
                  </p>
                </div>
                <span className="text-sm text-muted">Currently {f.aiPercent}% AI</span>
              </div>
              {f.details && <p className="mt-3 text-sm text-ink-soft">&ldquo;{f.details}&rdquo;</p>}
              <form action={resolveFlag} className="mt-4 flex gap-2">
                <input type="hidden" name="id" value={f.id} />
                <SubmitButton name="decision" value="dismiss" className="btn-ghost">
                  Dismiss
                </SubmitButton>
                <SubmitButton name="decision" value="uphold" className="btn-primary">
                  Uphold &amp; remove listing
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
