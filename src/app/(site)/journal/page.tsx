import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostGrid, PostGridSkeleton } from "@/components/PostCard";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, categoryLabel, isCategory } from "@/lib/categories";
import { searchPosts } from "@/lib/journal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Articles, poems, art, process notes and ideas, shared for free. Every post shows how much AI was involved.",
};

type Params = Record<string, string | string[] | undefined>;

export default function JournalPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Journal</p>
          <h1 className="mt-1 text-4xl font-light sm:text-5xl">Shared, not sold</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-soft">
            Articles, poems, sketches, process notes and ideas from the people who make things here. Same honesty rules
            as the market: every post shows how much AI was involved.
          </p>
        </div>
        <Link href="/journal/new" className="btn-primary">
          Write a post
        </Link>
      </div>
      <Suspense fallback={<PostGridSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function feedHref(params: { tab?: string; category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params.tab === "following") qs.set("tab", "following");
  if (params.category) qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  return qs.size ? `/journal?${qs}` : "/journal";
}

async function Feed({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = one(params.q)?.trim().slice(0, 100) ?? "";
  const rawCategory = one(params.category) ?? "";
  const category = isCategory(rawCategory) ? rawCategory : "";
  const tab = one(params.tab) === "following" ? "following" : "everyone";
  const user = await getCurrentUser();

  const posts = tab === "following" && !user ? [] : await searchPosts({ q, category, followedBy: tab === "following" ? user!.id : undefined });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-6 border-b border-line">
        {(["everyone", "following"] as const).map((t) => (
          <Link
            key={t}
            href={feedHref({ tab: t, category, q })}
            aria-current={tab === t ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-[15px] font-semibold ${
              tab === t ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "everyone" ? "Everyone" : "Following"}
          </Link>
        ))}
        <form className="mb-3 ml-auto flex w-full gap-2 sm:w-auto" role="search">
          {tab === "following" && <input type="hidden" name="tab" value="following" />}
          {category && <input type="hidden" name="category" value={category} />}
          <input name="q" defaultValue={q} placeholder="Search posts" className="field sm:w-64" aria-label="Search posts" />
          <button className="btn-ghost">Search</button>
        </form>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <Chip href={feedHref({ tab, q })} active={!category}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} href={feedHref({ tab, category: c.id, q })} active={category === c.id}>
            {c.label}
          </Chip>
        ))}
      </div>

      {tab === "following" && !user ? (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-medium">Follow people to build your own feed.</p>
          <p className="mt-2 text-ink-soft">
            <Link href="/login?next=%2Fjournal%3Ftab%3Dfollowing" className="link font-semibold text-ink">
              Log in
            </Link>{" "}
            to see posts from the creators you follow.
          </p>
        </div>
      ) : posts.length > 0 ? (
        <PostGrid posts={posts} />
      ) : (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-medium">
            {tab === "following" ? "Nothing from the people you follow yet." : category ? `No ${categoryLabel(category).toLowerCase()} posts yet.` : "No posts yet."}
          </p>
          <p className="mt-2 text-ink-soft">
            {tab === "following" ? (
              <>
                Find creators on the{" "}
                <Link href="/journal" className="link font-semibold text-ink">
                  Everyone
                </Link>{" "}
                tab and follow them from their profile.
              </>
            ) : (
              <>
                <Link href="/journal/new" className="link font-semibold text-ink">
                  Write the first one
                </Link>
                .
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-[0.97] ${
        active ? "border-ink bg-ink text-paper" : "border-line text-ink-soft hover:border-ink"
      }`}
    >
      {children}
    </Link>
  );
}
