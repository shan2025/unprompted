import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buyListing } from "@/app/actions/listings";
import { Cover } from "@/components/Cover";
import { FlagForm } from "@/components/FlagForm";
import { ScoreCard } from "@/components/Score";
import { SegmentView } from "@/components/SegmentView";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser } from "@/lib/auth";
import { categoryLabel, LICENSES, licenseLabel } from "@/lib/categories";
import { getListing, hasPurchased, salesCount } from "@/lib/data";
import { formatDate, formatPrice, plural, siteUrl } from "@/lib/format";
import { EVIDENCE_KINDS, TIER_INFO, type Tier } from "@/lib/scoring";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getListing(slug);
  if (!row || row.listing.status === "in_review" || row.listing.status === "removed") return { title: "Listing" };
  return {
    title: row.listing.title,
    description: `${row.listing.aiPercent}% AI · ${TIER_INFO[row.listing.tier as Tier]?.label}. ${row.listing.summary}`,
  };
}

export default function ListingPage(props: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <ListingView {...props} />
      </Suspense>
    </div>
  );
}

async function ListingView({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const row = await getListing(slug);
  if (!row) notFound();

  const { listing, creator } = row;
  const user = await getCurrentUser();
  const isOwner = user?.id === listing.creatorId;
  const isAdmin = user?.role === "admin";
  if ((listing.status === "in_review" || listing.status === "removed") && !isOwner && !isAdmin) notFound();

  const [purchased, sales] = await Promise.all([
    user ? hasPurchased(listing.id, user.id) : Promise.resolve(false),
    salesCount(listing.id),
  ]);
  const canSeeDeliverable = isOwner || purchased || isAdmin;
  const { analysis } = listing;
  const evidence = listing.evidence;

  const badgeAlt = `${listing.aiPercent}% AI, ${TIER_INFO[listing.tier as Tier]?.label ?? listing.tier}, on Unprompters`;
  const badgeSnippet = `<a href="${siteUrl()}/listing/${listing.slug}"><img src="${siteUrl()}/api/badge/${listing.slug}" alt="${badgeAlt}"></a>`;

  const purchase = (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl font-light">{formatPrice(listing.priceCents)}</span>
        <span className="text-sm text-muted">{plural(sales, "sale")}</span>
      </div>
      <p className="mt-1 text-sm text-ink-soft">{licenseLabel(listing.license)}</p>
      <div className="mt-4">
        {isOwner ? (
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-ink-soft">This is your listing.</p>
        ) : purchased ? (
          <p className="rounded-lg bg-paper px-4 py-3 text-sm font-semibold text-human">You own this. It&apos;s unlocked below.</p>
        ) : listing.status === "sold" ? (
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-ink-soft">Sold. This was an exclusive listing.</p>
        ) : listing.status !== "published" ? (
          <p className="rounded-lg bg-paper px-4 py-3 text-sm text-ink-soft">Not available while under review.</p>
        ) : (
          <form action={buyListing.bind(null, listing.slug)}>
            <SubmitButton className="btn-accent w-full py-3 text-[15px]" pendingText="Processing…">
              {listing.priceCents === 0 ? "Get it free" : `Buy for ${formatPrice(listing.priceCents)}`}
            </SubmitButton>
            <p className="mt-2 text-center text-xs text-muted">Demo checkout: no card is charged.</p>
          </form>
        )}
      </div>
    </div>
  );
  const scoreCard = <ScoreCard score={analysis.score} evidenceCount={evidence.length} />;

  return (
    <>
      <Banners status={listing.status} created={query.created === "1"} purchased={query.purchased === "1"} isOwner={isOwner} />

      <nav className="mb-4 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-ink">
          Explore
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/explore?category=${listing.category}`} className="hover:text-ink">
          {categoryLabel(listing.category)}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <h1 className="text-4xl font-light leading-tight sm:text-5xl">{listing.title}</h1>
          <p className="mt-3 text-ink-soft">
            by{" "}
            <Link href={`/u/${creator.handle}`} className="link font-semibold text-ink">
              {creator.name}
            </Link>{" "}
            · listed {formatDate(listing.createdAt)}
            {listing.isDemo && <span className="ml-2 rounded bg-line/70 px-1.5 py-0.5 text-[11px] font-semibold text-muted">DEMO LISTING</span>}
          </p>

          <div className="card mt-6 aspect-[16/9] overflow-hidden">
            <Cover slug={listing.slug} category={listing.category} coverFile={listing.coverFile} title={listing.title} />
          </div>

          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{listing.summary}</p>

          {/* On small screens, price and score come before the long content. */}
          <div className="mt-6 space-y-5 lg:hidden">
            {purchase}
            {scoreCard}
          </div>

          {listing.preview && (
            <section className="mt-10">
              <h2 className="text-2xl font-normal">Preview</h2>
              <div className="card mt-4 p-5 sm:p-6">
                <SegmentView text={listing.preview} segments={analysis.previewSegments} kind={analysis.previewKind} />
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-normal">What you get</h2>
            {canSeeDeliverable ? (
              <div className="card mt-4 p-5 sm:p-6">
                {listing.locked ? (
                  <div className={`whitespace-pre-wrap break-words leading-relaxed ${analysis.previewKind === "code" ? "font-mono text-[13px]" : ""}`}>
                    {listing.locked}
                  </div>
                ) : (
                  <p className="text-ink-soft">The preview above is the full work.</p>
                )}
              </div>
            ) : (
              <div className="card mt-4 flex flex-col items-start gap-3 border-dashed p-6 sm:flex-row sm:items-center">
                <LockIcon />
                <p className="flex-1 text-ink-soft">
                  {listing.locked
                    ? "The full work unlocks after purchase. It was scanned along with the preview, so the score covers it too."
                    : "The preview above is the full work. Buying supports the creator and grants the license below."}
                </p>
              </div>
            )}
            <p className="mt-3 text-sm text-muted">
              License: <strong className="text-ink">{licenseLabel(listing.license)}</strong>.{" "}
              {LICENSES.find((l) => l.id === listing.license)?.blurb}
            </p>
          </section>

          {listing.aiNotes && (
            <section className="mt-10">
              <h2 className="text-2xl font-normal">AI use, in the creator&apos;s words</h2>
              <blockquote className="mt-4 border-l-2 border-accent pl-4 italic leading-relaxed text-ink-soft">{listing.aiNotes}</blockquote>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-normal">Process evidence</h2>
            {evidence.length === 0 ? (
              <p className="mt-3 text-ink-soft">The creator hasn&apos;t attached any process evidence yet.</p>
            ) : (
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
            )}
            <p className="mt-3 text-xs text-muted">Evidence links are supplied by the creator. Check them yourself, and report anything that doesn&apos;t add up.</p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-normal">How this was scored</h2>
            <div className="card mt-4 space-y-4 p-5 text-sm leading-relaxed text-ink-soft">
              <p>
                Disclosed by the creator: <strong className="text-ink">{analysis.score.disclosedPercent}%</strong>. Estimate
                after automated checks and evidence: <strong className="text-ink">{analysis.score.percent}%</strong> (likely{" "}
                {analysis.score.low}–{analysis.score.high}%).
              </p>
              {analysis.sources.length > 0 && (
                <div>
                  <span className="eyebrow">Checks run</span>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.sources.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.signals.length > 0 && (
                <div>
                  <span className="eyebrow">What the text scan noticed</span>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.signals.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.media && (
                <div>
                  <span className="eyebrow">Image metadata</span>
                  <ul className="mt-1 list-inside list-disc">
                    {analysis.media.findings.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted">
                Automated checks are signals, not proof. <Link href="/standard" className="link">Read the full method</Link>.
              </p>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="hidden space-y-5 lg:block">
            {purchase}
            {scoreCard}
          </div>

          <div className="card p-5">
            <span className="eyebrow">Creator</span>
            <Link href={`/u/${creator.handle}`} className="mt-2 block font-display text-xl font-medium hover:text-accent">
              {creator.name}
            </Link>
            <p className="text-sm text-muted">@{creator.handle}</p>
            {creator.bio && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{creator.bio}</p>}
          </div>

          {listing.status === "published" || listing.status === "sold" ? (
            <div className="card p-5">
              <span className="eyebrow">Embed this badge</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG badge from our own route */}
              <img src={`/api/badge/${listing.slug}`} alt={badgeAlt} className="mt-3 h-6" />
              <pre className="mt-3 overflow-x-auto no-scrollbar whitespace-pre-wrap break-all rounded-lg bg-paper p-3 font-mono text-[11px] text-ink-soft">
                {badgeSnippet}
              </pre>
            </div>
          ) : null}

          {!isOwner && (
            <div className="px-1">
              <FlagForm listingId={listing.id} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Banners({ status, created, purchased, isOwner }: { status: string; created: boolean; purchased: boolean; isOwner: boolean }) {
  const banner = (tone: string, text: React.ReactNode) => (
    <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tone}`} role="status">
      {text}
    </div>
  );
  if (status === "in_review") {
    return banner(
      "border-assist/40 bg-card text-ink",
      isOwner ? (
        <>
          <strong>In review.</strong> Automated checks found more AI than you disclosed, so a moderator will look at this
          before it goes live. Adding process evidence helps.
        </>
      ) : (
        <>
          <strong>In review.</strong> Hidden from the market until a moderator decides.
        </>
      ),
    );
  }
  if (status === "removed") return banner("border-heavy/40 bg-card text-ink", <><strong>Removed.</strong> This listing is no longer in the market.</>);
  if (created) return banner("border-human/40 bg-card text-ink", <><strong>Your listing is live.</strong> Share the badge below to show your score anywhere.</>);
  if (purchased) return banner("border-human/40 bg-card text-ink", <><strong>It&apos;s yours.</strong> The full work is unlocked below. (Demo purchase, no payment taken.)</>);
  return null;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function ListingSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy="true">
      <div className="space-y-4">
        <div className="h-12 w-3/4 animate-pulse rounded bg-line/70" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-line/70" />
        <div className="card aspect-[16/9] animate-pulse" />
      </div>
      <div className="space-y-5">
        <div className="card h-40 animate-pulse" />
        <div className="card h-96 animate-pulse" />
      </div>
    </div>
  );
}
