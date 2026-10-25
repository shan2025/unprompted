"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { Cover } from "./Cover";
import { Logo } from "./Logo";

type Goal = "sell" | "buy";

const GOALS: { id: Goal; label: string; hint: string }[] = [
  { id: "sell", label: "Sell my work", hint: "List something you made and show how much of it is yours." },
  { id: "buy", label: "Find human-made work", hint: "Browse code, writing, art and more, with the AI share on every listing." },
];

const SELLER_AI = [
  { id: "none", label: "None at all", hint: "Spellcheck at most. Your work is marked Human-made." },
  { id: "light", label: "A little help", hint: "AI suggested or checked things; every creative choice was yours." },
  { id: "substantial", label: "Some parts", hint: "AI produced parts that you edited and kept." },
];

const BUYER_AI = [
  { id: "5", label: "None", hint: "Human-made only: 0–5% AI." },
  { id: "20", label: "A little", hint: "Up to 20%: people made it, AI helped at the edges." },
  { id: "50", label: "Some", hint: "Up to 50%: real authorship with meaningful AI help." },
  { id: "", label: "Show me everything", hint: "I'll decide listing by listing." },
];

// Everyday words people type, mapped to our categories.
const SYNONYMS: Record<CategoryId, string[]> = {
  code: ["software", "script", "library", "app", "plugin", "api", "programming", "developer", "tool", "snippet"],
  website: ["site", "template", "theme", "landing page", "web design", "portfolio", "wordpress", "html"],
  writing: ["essay", "story", "novel", "book", "article", "blog", "screenplay", "copywriting", "ebook", "guide"],
  poetry: ["poem", "lyrics", "spoken word", "verse", "haiku"],
  art: ["illustration", "painting", "drawing", "sketch", "comic", "watercolour", "watercolor", "digital art"],
  photography: ["photo", "photograph", "prints", "stock", "film", "camera"],
  design: ["logo", "font", "typeface", "lettering", "ui", "ux", "branding", "pattern", "graphic"],
  music: ["song", "beat", "track", "sample", "audio", "podcast", "sound", "stems", "composition"],
  idea: ["concept", "business plan", "startup", "plot", "pitch", "invention", "product"],
  other: ["craft", "anything"],
};

function matches(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [...CATEGORIES];
  return CATEGORIES.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.blurb.toLowerCase().includes(q) ||
      SYNONYMS[c.id].some((s) => s.includes(q) || q.includes(s)),
  );
}

export function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [ai, setAi] = useState<string | null>(null);

  const steps = [
    { title: "What brings you here?", sub: "We'll set things up around what you want to do." },
    goal === "buy"
      ? { title: "What are you looking for?", sub: "We'll show you the work that fits." }
      : { title: "What do you make?", sub: "Pick the closest fit. You can list in other categories later." },
    goal === "buy"
      ? { title: "How much AI is okay?", sub: "Every listing shows its AI involvement, so the choice is yours." }
      : { title: "How much AI goes into your work?", sub: "Be honest: it sets the floor of your score." },
  ];

  const ready = [goal !== null, category !== null, ai !== null][step];
  const last = step === steps.length - 1;

  function next() {
    if (!ready) return;
    if (!last) return setStep(step + 1);
    if (goal === "sell") {
      router.push(`/sell?category=${category}&ai=${ai}`);
    } else {
      router.push(`/explore?category=${category}${ai ? `&maxAi=${ai}` : ""}`);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(320px,26vw)]">
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-[88px] items-center justify-between px-5 sm:px-12">
          <Link href="/" aria-label="Unprompted home">
            <Logo />
          </Link>
          <Link href="/explore" className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60 lg:hidden">
            I&apos;m just browsing
          </Link>
        </header>

        <main className="grid flex-1 content-start gap-10 px-5 pb-12 pt-10 sm:px-12 lg:grid-cols-[minmax(240px,340px)_minmax(0,560px)] lg:gap-16 lg:pt-32">
          <div key={`q${step}${goal}`} className="rise">
            <h1 className="text-[30px] font-light leading-tight sm:text-[34px]">{steps[step].title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{steps[step].sub}</p>
            <div className="relative mt-10 h-px w-28 bg-line" aria-hidden="true">
              <div className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
            <p className="sr-only">
              Step {step + 1} of {steps.length}
            </p>
          </div>

          <div key={`a${step}${goal}`} className="rise">
            {step === 0 && <Choices options={GOALS} value={goal} onChange={(v) => setGoal(v as Goal)} onPick={next} />}
            {step === 1 && <CategorySearch value={category} onChange={setCategory} onSubmit={next} />}
            {step === 2 && <Choices options={goal === "buy" ? BUYER_AI : SELLER_AI} value={ai} onChange={setAi} onPick={next} />}
          </div>
        </main>

        <footer className="sticky bottom-0 flex h-[96px] items-center justify-between border-t border-line bg-white px-5 sm:px-12">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="text-[13px] font-semibold uppercase tracking-[0.08em] hover:opacity-60">
              Back
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={next} disabled={!ready} className="btn-primary min-w-[104px] py-4">
            {last ? "Continue" : "Next"}
          </button>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden lg:block">
        <div key={category ?? "none"} className="fade absolute inset-0">
          <Cover slug={`start-${category ?? "welcome"}`} category={category ?? "writing"} title="" palette={0} className="h-full" />
        </div>
        <Link
          href="/explore"
          className="absolute right-8 top-8 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink hover:opacity-60"
        >
          I&apos;m just browsing
        </Link>
      </aside>
    </div>
  );
}

function Choices({
  options,
  value,
  onChange,
  onPick,
}: {
  options: { id: string; label: string; hint: string }[];
  value: string | null;
  onChange: (id: string) => void;
  onPick: () => void;
}) {
  return (
    <div role="radiogroup" className="divide-y divide-line border-y border-line">
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            onDoubleClick={onPick}
            className="group flex w-full items-start gap-4 py-5 text-left"
          >
            <span
              className={`mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                selected ? "border-ink bg-ink" : "border-[#bdbdbd] group-hover:border-ink"
              }`}
              aria-hidden="true"
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span>
              <span className={`block text-[19px] ${selected ? "text-ink" : "text-ink-soft group-hover:text-ink"}`}>{o.label}</span>
              <span className="mt-1 block text-sm text-muted">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CategorySearch({
  value,
  onChange,
  onSubmit,
}: {
  value: CategoryId | null;
  onChange: (id: CategoryId) => void;
  onSubmit: () => void;
}) {
  const selected = CATEGORIES.find((c) => c.id === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(!selected);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => matches(selected && query === selected.label ? "" : query), [query, selected]);

  function pick(id: CategoryId, label: string) {
    onChange(id);
    setQuery(label);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor="category-search" className="sr-only">
        Search categories
      </label>
      <div className="flex items-center gap-3 border-b border-ink bg-field px-5">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id="category-search"
          autoFocus
          autoComplete="off"
          value={query}
          placeholder="Search for your craft"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (open && results[0]) pick(results[0].id, results[0].label);
            else if (value) onSubmit();
          }}
          className="h-[72px] w-full bg-transparent text-[18px] text-ink placeholder:text-muted focus:outline-none"
          role="combobox"
          aria-expanded={open}
          aria-controls="category-list"
        />
      </div>

      {open && (
        <div id="category-list" role="listbox" className="absolute inset-x-0 top-full z-10 max-h-[340px] overflow-y-auto bg-white py-4 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.18)]">
          <p className="px-8 pb-2 text-[13px] font-semibold text-ink-soft">{query.trim() ? "Matches" : "Popular categories"}</p>
          {results.length === 0 && (
            <button type="button" onClick={() => pick("other", "Other")} className="block w-full px-8 py-2.5 text-left text-[18px] text-ink-soft hover:text-ink">
              No exact match. Choose <span className="text-ink">Other</span>
            </button>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={value === c.id}
              onClick={() => pick(c.id, c.label)}
              className="flex w-full items-baseline justify-between gap-4 px-8 py-2.5 text-left hover:bg-field"
            >
              <span className="text-[18px] text-ink-soft">{c.label}</span>
              <span className="hidden text-xs text-muted sm:block">{c.blurb}</span>
            </button>
          ))}
        </div>
      )}

      {selected && !open && (
        <p className="mt-5 text-sm text-muted">
          {selected.blurb}.{" "}
          <button type="button" className="link text-ink" onClick={() => (setOpen(true), inputRef.current?.focus())}>
            Change
          </button>
        </p>
      )}
    </div>
  );
}
