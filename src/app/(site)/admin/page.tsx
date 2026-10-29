import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { resolveFlag, reviewListing, reviewPost } from "@/app/actions/admin";
import { AiPill } from "@/components/Score";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { getReviewQueue } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getPostReviewQueue } from "@/lib/journal";
import { EVIDENCE_KINDS } from "@/lib/scoring";

export const metadata: Metadata = { title: "Review queue" };

const REASONS: Record<string, string> = {
  "undisclosed-ai": "Undisclosed AI use",
  stolen: "Not the seller's work",
  misleading: "Misleading or spam",
  abusive: "Abusive",
  other: "Something else",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="eyebrow">Moderation</p>
      <h1 className="mt-1 text-4xl font-light">Review queue</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        Listings and journal posts land here when automated checks disagree with the creator&apos;s disclosure, or when
        someone reports them.
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
  const [{ pending, openFlags }, journal] = await Promise.all([getReviewQueue(), getPostReviewQueue()]);

  return (
    <>
      <section className="mt-10">
        <h2 className="text-2xl font-normal">Listings awaiting review ({pending.length})</h2>
        {pending.length === 0 && <p className="mt-3 text-ink-soft">Nothing waiting.</p>}
        <ul className="mt-4 space-y-4">
          {pending.map(({ listing, creatorName, creatorHandle }) => {
            const s = listing.analysis.score;
            return (
              <li key={listing.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/listing/${listing.slug}`} className="font-display text-xl font-medium hover:text-accent">
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
        <h2 className="text-2xl font-normal">Open reports ({openFlags.length})</h2>
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

      <section className="mt-12">
        <h2 className="text-2xl font-normal">Journal posts awaiting review ({journal.pending.length})</h2>
        {journal.pending.length === 0 && <p className="mt-3 text-ink-soft">Nothing waiting.</p>}
        <ul className="mt-4 space-y-4">
          {journal.pending.map(({ post, authorName, authorHandle }) => {
            const s = post.analysis.score;
            return (
              <li key={post.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/journal/${post.slug}`} className="font-display text-xl font-medium hover:text-accent">
                      {post.title}
                    </Link>
                    <p className="text-sm text-muted">
                      by {authorName} (@{authorHandle}) · {formatDate(post.createdAt)}
                    </p>
                  </div>
                  <AiPill percent={post.aiPercent} tier={post.tier} verified={post.processVerified} />
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  Disclosed <strong className="text-ink">{s.disclosedPercent}%</strong>, estimate{" "}
                  <strong className="text-ink">{s.percent}%</strong>, detector disagreement{" "}
                  <strong className="text-ink">{s.discrepancy} pts</strong>.
                </p>
                {post.analysis.signals.length > 0 && <p className="mt-1 text-sm text-muted">Signals: {post.analysis.signals.join("; ")}</p>}
                {post.analysis.media && <p className="mt-1 text-sm text-muted">Metadata: {post.analysis.media.findings.join(" ")}</p>}
                <p className="mt-1 text-sm text-muted">
                  Evidence: {post.evidence.length ? post.evidence.map((e) => EVIDENCE_KINDS[e.kind]?.label ?? e.kind).join(", ") : "none"}
                </p>
                <form action={reviewPost} className="mt-4 flex gap-2">
                  <input type="hidden" name="id" value={post.id} />
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
        <h2 className="text-2xl font-normal">Reports on posts and comments ({journal.postFlags.length + journal.commentFlags.length})</h2>
        {journal.postFlags.length + journal.commentFlags.length === 0 && <p className="mt-3 text-ink-soft">No open reports.</p>}
        <ul className="mt-4 space-y-4">
          {journal.postFlags.map((f) => (
            <li key={f.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Post</span>
                  <Link href={`/journal/${f.postSlug}`} className="block font-semibold hover:text-accent">
                    {f.postTitle}
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
                  Uphold &amp; remove post
                </SubmitButton>
              </form>
            </li>
          ))}
          {journal.commentFlags.map((f) => (
            <li key={f.id} className="card p-5">
              <span className="eyebrow">Comment</span>
              <p className="text-sm text-muted">
                On{" "}
                <Link href={`/journal/${f.postSlug}#comments`} className="font-semibold text-ink hover:text-accent">
                  {f.postTitle}
                </Link>{" "}
                · {REASONS[f.reason]} · reported by @{f.reporter} · {formatDate(f.createdAt)}
                {f.commentStatus === "removed" && " · already removed"}
              </p>
              <blockquote className="mt-3 border-l-2 border-line pl-3 text-sm text-ink">{f.commentBody}</blockquote>
              {f.details && <p className="mt-3 text-sm text-ink-soft">Reporter: &ldquo;{f.details}&rdquo;</p>}
              <form action={resolveFlag} className="mt-4 flex gap-2">
                <input type="hidden" name="id" value={f.id} />
                <SubmitButton name="decision" value="dismiss" className="btn-ghost">
                  Dismiss
                </SubmitButton>
                <SubmitButton name="decision" value="uphold" className="btn-primary">
                  Uphold &amp; remove comment
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
