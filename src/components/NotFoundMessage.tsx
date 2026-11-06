import Link from "next/link";

export function NotFoundMessage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center sm:px-6">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-5xl font-light">Nothing here.</h1>
      <p className="mt-4 text-lg text-ink-soft">This page doesn&apos;t exist, or it was taken down.</p>
      <Link href="/explore" className="btn-primary mt-10">
        Explore the work
      </Link>
    </div>
  );
}
