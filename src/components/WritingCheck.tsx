"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { TextAnalysis } from "@/lib/analysis/text";
import { plural } from "@/lib/format";
import {
  checkWriting,
  EXAMPLE_TEXT,
  isFlagged,
  isMild,
  isStrong,
  MAX_CHECK_CHARS,
  MIN_CHECK_WORDS,
  patternLevel,
  patternPercent,
  reasonsFlagged,
  type PatternLevel,
} from "@/lib/writing-check";
import { CountUp } from "./CountUp";

type Kind = "prose" | "poetry";

const KINDS: { id: Kind; label: string }[] = [
  { id: "prose", label: "Essay, article or story" },
  { id: "poetry", label: "Poem" },
];

/**
 * What was checked, kept apart from the box, so editing the text doesn't move
 * the highlights. `run` counts the checks, so each one plays the card's animation afresh.
 */
type Result = { text: string; kind: Kind; analysis: TextAnalysis; run: number };

// The label on the card and its colour. The low levels are plain ink, never
// green: finding no obvious habits is not a pass, and mustn't look like one.
const LEVELS: Record<PatternLevel, { label: string; text: string; bar: string }> = {
  none: { label: "No obvious patterns", text: "text-ink", bar: "bg-ink" },
  mild: { label: "Mild patterns only", text: "text-ink", bar: "bg-ink" },
  some: { label: "Some clear patterns", text: "text-led", bar: "bg-led" },
  many: { label: "Many clear patterns", text: "text-assist", bar: "bg-assist" },
  most: { label: "Mostly clear patterns", text: "text-heavy", bar: "bg-heavy" },
};

/** Words as a word processor counts them, so the number under the box and the one on the result card agree. */
function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// Stagger delay for the card's entrance animations (.si-* in globals.css).
const d = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

// Paste writing, see which passages carry the patterns AI detectors look for,
// and why. The check runs here in the browser: nothing is sent anywhere.
export function WritingCheck() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("prose");
  const [result, setResult] = useState<Result | null>(null);
  const [empty, setEmpty] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const words = countWords(text);

  function check(event: React.FormEvent) {
    event.preventDefault();
    const checked = text.trim();
    const analysis = checkWriting(checked, kind);
    if (analysis.words === 0) {
      setEmpty(true);
      setResult(null);
      return;
    }
    setEmpty(false);
    setResult((previous) => ({ text: checked, kind, analysis, run: (previous?.run ?? 0) + 1 }));
    // Bring the answer into view once it has been drawn.
    requestAnimationFrame(() => {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      results.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    });
  }

  function clear() {
    setText("");
    setResult(null);
    setEmpty(false);
  }

  return (
    <div>
      <form onSubmit={check} className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="writing" className="text-sm font-medium text-ink">
            Your writing
          </label>
          <button
            type="button"
            onClick={() => {
              setText(EXAMPLE_TEXT);
              setKind("prose");
              setEmpty(false);
            }}
            className="link text-sm text-ink-soft hover:text-ink"
          >
            Fill in an example
          </button>
        </div>
        <textarea
          id="writing"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_CHECK_CHARS}
          rows={10}
          placeholder="Paste your essay, assignment or article here."
          aria-describedby="writing-note"
          className="field mt-2 min-h-56 resize-y leading-relaxed"
        />
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted">
          <p id="writing-note">
            Checked in your browser. Your text is not uploaded, stored or used for anything. Up to {MAX_CHECK_CHARS.toLocaleString("en")} characters.
          </p>
          <p className="tabular-nums">{plural(words, "word")}</p>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-ink">What is it?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <label
                key={k.id}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper"
              >
                <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>

        {empty && (
          <p role="alert" className="mt-4 text-sm font-medium text-heavy">
            Paste some writing first.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" className="btn-primary">
            Check my writing
          </button>
          {(text || result) && (
            <button type="button" onClick={clear} className="btn-ghost">
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Screen readers hear the one-line answer; the passages below are there to read through. */}
      <p role="status" className="sr-only">
        {result ? headline(result) : ""}
      </p>
      <div ref={results} className="scroll-mt-20">
        {result && <Results result={result} />}
      </div>
    </div>
  );
}

/** The answer in one sentence. */
function headline({ analysis }: Result) {
  const total = analysis.segments.length;
  const flagged = analysis.segments.filter(isFlagged).length;
  const mild = analysis.segments.filter(isMild).length;
  if (flagged > 0) {
    return total === 1
      ? "This passage shows clear signs of AI writing."
      : `${flagged} of your ${total} passages ${flagged === 1 ? "shows" : "show"} clear signs of AI writing.`;
  }
  if (mild > 0) {
    return total === 1
      ? "This passage shows mild signs of AI writing, none of them clear."
      : `No passage shows clear signs of AI writing, but ${mild} of ${total} ${mild === 1 ? "shows" : "show"} mild ones.`;
  }
  return total === 1
    ? "This passage shows none of the obvious signs of AI writing."
    : `None of your ${total} passages show the obvious signs of AI writing.`;
}

// The headline number, formed the way the home page's example score card is:
// the percentage counts up, the label pops in, the bar grows and the rows rise.
function PatternCard({ analysis, words }: { analysis: TextAnalysis; words: number }) {
  const percent = patternPercent(analysis);
  const flagged = analysis.segments.filter(isFlagged).length;
  const mild = analysis.segments.filter(isMild).length;
  const level = LEVELS[patternLevel(percent, mild)];
  const common = analysis.signals.filter((signal) => !signal.endsWith("(human-typical)"));
  const rows = [
    { label: "Words checked", value: words.toLocaleString("en") },
    { label: "Passages checked", value: analysis.segments.length },
    { label: "Passages with clear patterns", value: flagged, marked: flagged > 0 },
    { label: "Passages with mild patterns", value: mild, marked: mild > 0 },
  ];
  // The lower the number, the more it looks like good news, so that is when the card must say it isn't a pass.
  const low = percent <= 20;

  return (
    <div className="card mt-3 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow">Obvious AI patterns</span>
        <span className="si-pop" style={d(900)}>
          <span className={`inline-flex items-center border border-current px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${level.text}`}>
            {level.label}
          </span>
        </span>
      </div>

      <div className="si-rise mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1" style={d(150)}>
        <span className={`font-display text-6xl font-light tracking-tight tabular-nums ${level.text}`}>
          <CountUp to={percent} delay={300} duration={1100} />%
        </span>
        <span className="text-sm text-ink-soft">of your text shows clear signs of AI writing</span>
      </div>

      <div className="mt-4 h-1.5 bg-field" aria-hidden="true">
        <div className={`si-grow h-full ${level.bar}`} style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%`, ...d(300) }} />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        This check looks for a short list of obvious habits. It is not a trained detector: tools such as Turnitin, GPTZero and QuillBot judge the whole
        text, and can score it very differently from this and from each other.
      </p>

      {low && (
        <p className="si-rise mt-4 border-l-2 border-assist bg-field px-3 py-2.5 text-sm leading-relaxed text-ink" style={d(700)}>
          <strong className="font-semibold">A low score is not a pass.</strong> A lot of AI-written and AI-polished text shows none of these habits, so
          this result can&apos;t tell you that another detector won&apos;t flag it.
        </p>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <span className="eyebrow si-rise block" style={d(1000)}>
          What the check found
        </span>
        <ul className="mt-2 space-y-2.5">
          {rows.map((row, i) => (
            <li key={row.label} className="si-rise flex items-center justify-between gap-3 text-sm" style={d(1100 + i * 80)}>
              <span className="text-ink-soft">{row.label}</span>
              <span className={`font-semibold tabular-nums ${row.marked ? "text-assist" : "text-ink"}`}>{row.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="si-rise mt-4 border-t border-line pt-4 text-sm" style={d(1100 + rows.length * 80)}>
        <span className="text-ink-soft">Most common patterns: </span>
        <span className="text-ink">{common.length > 0 ? common.join(" · ") : "none stood out"}</span>
      </div>
    </div>
  );
}

function Results({ result }: { result: Result }) {
  const { text, kind, analysis } = result;
  const segments = [...analysis.segments].sort((a, b) => a.start - b.start);
  const flagged = segments.filter(isFlagged).length;
  const short = analysis.words < MIN_CHECK_WORDS;

  return (
    <section className="mt-10">
      <p className="eyebrow">Result</p>
      {/* Keyed by the check, so the card forms again each time. */}
      <PatternCard key={result.run} analysis={analysis} words={countWords(text)} />
      <h2 className="mt-8 text-2xl font-light leading-tight sm:text-3xl">{headline(result)}</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        {flagged === 0
          ? "That is not a pass, and it doesn't show who wrote it. This check only catches obvious habits, and a trained detector may still flag the same text."
          : "That doesn't mean AI wrote it. These are habits of style that many people share, and they are what gets human writing wrongly flagged."}
      </p>
      {short && (
        <p className="mt-3 border-l-2 border-assist pl-3 text-sm leading-relaxed text-ink-soft">
          This is only {plural(analysis.words, "word")}. Under about {MIN_CHECK_WORDS} words there is too little to go on, so read this result lightly.
        </p>
      )}

      <ol className="mt-8 space-y-4">
        {segments.map((segment, i) => {
          const piece = text.slice(segment.start, segment.end);
          const reasons = reasonsFlagged(segment);
          const body = `whitespace-pre-wrap break-words leading-relaxed text-ink ${kind === "poetry" ? "" : "text-[16px]"}`;
          if (!isFlagged(segment) && !isMild(segment)) {
            return (
              <li key={segment.start} className="px-4">
                <p className={body}>{piece}</p>
              </li>
            );
          }
          // A mild passage gets the outline without the highlight, so it reads as "worth a look", not as a flag.
          const mild = isMild(segment);
          return (
            <li
              key={segment.start}
              className={`border-l-2 px-4 py-3 ${mild ? "border-line bg-field/60" : "border-assist"}`}
              style={mild ? undefined : { backgroundColor: isStrong(segment) ? "var(--mark)" : "color-mix(in srgb, var(--mark) 45%, transparent)" }}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${mild ? "text-ink-soft" : "text-assist"}`}>
                Passage {i + 1} · {mild ? "mild pattern" : isStrong(segment) ? "strong pattern" : "clear pattern"}
              </p>
              <p className={`mt-2 ${body}`}>{piece}</p>
              <p className="mt-3 text-sm font-medium text-ink">{mild ? "What it picked up" : "Why it stands out"}</p>
              {reasons.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-soft">
                  {reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              {(mild || reasons.length === 0) && (
                <p className="mt-1 text-sm text-ink-soft">
                  {reasons.length > 0 ? "Plus small" : "Small"} habits adding up, such as fairly even sentence lengths or lists of three. None is strong on
                  its own.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-10 bg-ink p-8 text-paper">
        <p className="font-display text-2xl font-normal">Wrote it yourself? Show how.</p>
        <p className="mt-2 max-w-xl leading-relaxed text-paper/80">
          A detector can&apos;t prove you wrote something. Your drafts can. Share the piece on Unprompters with your drafts or version history attached, and it
          gets a page that shows how it was made.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/journal/new" className="btn bg-paper text-ink hover:bg-paper/85">
            Share your writing
          </Link>
          <Link href="/standard" className="btn border border-paper/40 text-paper hover:bg-paper/10">
            How scoring works
          </Link>
        </div>
      </div>
    </section>
  );
}
