// The free "Does my writing look AI-generated?" page (/ai-writing-check). It
// runs the same built-in analyzer as posts and listings, in the visitor's
// browser, so the text they paste is never sent to us.

import type { Segment } from "./analysis/text";

export const WRITING_CHECK_PATH = "/ai-writing-check";

/** Longest text the page will check at once: about 5,000 words. */
export const MAX_CHECK_CHARS = 30_000;

/** Under this many words there is too little for the patterns to mean anything. */
export const MIN_CHECK_WORDS = 40;

// The same cut-offs the passage view on posts and listings uses (SegmentView).
const FLAGGED = 0.35;
const STRONG = 0.65;

export function isFlagged(segment: Segment) {
  return segment.ai >= FLAGGED;
}

export function isStrong(segment: Segment) {
  return segment.ai >= STRONG;
}

// Plain human writing scores 2–6% a passage in the test samples and obvious
// AI text 99–100%. Text in between (polished, generic or lightly edited
// writing) often lands at 15–35%: under the line for a clear flag, but not nothing.
const MILD = 0.15;

/** Some habits, short of a clear flag. Shown, so a result of "no clear patterns" never hides what was found. */
export function isMild(segment: Segment) {
  return segment.ai >= MILD && segment.ai < FLAGGED;
}

/** The patterns that counted against a passage. Signals that counted in its favour are marked "(human-typical)" and left out. */
export function reasonsFlagged(segment: Segment) {
  return segment.signals.filter((signal) => !signal.endsWith("(human-typical)"));
}

/**
 * How much of the text shows clear signs of AI writing, as a whole percent. It
 * is the same figure a post's score card reports as "Automated scan: N% looks
 * machine-made": passages weighted by length and by how strong their patterns
 * are. It estimates style, not authorship.
 */
export function patternPercent(analysis: { aiShare: number }) {
  return Math.round(analysis.aiShare * 100);
}

/**
 * A plain label for the result. It describes the writing's patterns and never
 * says who wrote it. There is no "clean" level: this check is a short list of
 * obvious habits, so finding none is not a pass.
 */
export type PatternLevel = "none" | "mild" | "some" | "many" | "most";

// Above the bottom step these follow the site's tiers (6–20, 21–50, 51+).
export function patternLevel(percent: number, mildPassages: number): PatternLevel {
  if (percent <= 5) return mildPassages > 0 ? "mild" : "none";
  if (percent <= 20) return "some";
  if (percent <= 50) return "many";
  return "most";
}

// Two paragraphs written for this page: the first piles up the habits the
// check looks for, the second is ordinary casual writing. Neither is anyone's work.
export const EXAMPLE_TEXT = `In today's fast-paced world, it's important to note that writing plays a crucial role in how we connect. Moreover, a robust and nuanced voice is not just a skill, but a testament to the rich tapestry of human experience. Additionally, it empowers us to navigate the complexities of an ever-evolving landscape. Ultimately, embracing this transformative journey unlocks the full potential of every writer.

Honestly I don't know why I keep rewriting this paragraph. It was fine yesterday. Then I read it out loud on the bus, got to the bit about my grandmother's kitchen, and it sounded like someone else wrote it, so here I am again. Third coffee. The cat is asleep on my notes, which is probably her review.`;
