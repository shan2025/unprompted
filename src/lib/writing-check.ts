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

/** The patterns that counted against a passage. Signals that counted in its favour are marked "(human-typical)" and left out. */
export function reasonsFlagged(segment: Segment) {
  return segment.signals.filter((signal) => !signal.endsWith("(human-typical)"));
}

// Two paragraphs written for this page: the first piles up the habits the
// check looks for, the second is ordinary casual writing. Neither is anyone's work.
export const EXAMPLE_TEXT = `In today's fast-paced world, it's important to note that writing plays a crucial role in how we connect. Moreover, a robust and nuanced voice is not just a skill, but a testament to the rich tapestry of human experience. Additionally, it empowers us to navigate the complexities of an ever-evolving landscape. Ultimately, embracing this transformative journey unlocks the full potential of every writer.

Honestly I don't know why I keep rewriting this paragraph. It was fine yesterday. Then I read it out loud on the bus, got to the bit about my grandmother's kitchen, and it sounded like someone else wrote it, so here I am again. Third coffee. The cat is asleep on my notes, which is probably her review.`;
