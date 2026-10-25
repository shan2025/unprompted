import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-28 text-center sm:px-6">
          <p className="eyebrow">404</p>
          <h1 className="mt-3 text-5xl font-light">Nothing here.</h1>
          <p className="mt-4 text-lg text-ink-soft">This page doesn&apos;t exist, or the listing was taken down.</p>
          <Link href="/explore" className="btn-primary mt-10">
            Back to the market
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
