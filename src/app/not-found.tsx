import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-5xl font-semibold">Nothing here.</h1>
      <p className="mt-4 text-lg text-ink-soft">This page doesn&apos;t exist, or the listing was taken down.</p>
      <Link href="/explore" className="btn-primary mt-8">
        Back to the market
      </Link>
    </div>
  );
}
