import {
  FORMULAS,
  HUMAN_CODE_TELLS,
  HUMAN_MARKERS,
  NARRATING_COMMENT,
  POETIC_CLICHES,
  STRONG_AI_PHRASES,
  TRANSITION_START,
  WEAK_AI_WORDS,
} from "./lexicon";

// Built-in, transparent heuristic analyzer. It looks at style statistics that
// differ between typical model output and typical human writing, scores each
// passage, and reports what share of the text looks machine-generated.
//
// It is deliberately conservative: confidence is capped well below 1 because
// heuristics like these are easy to fool in both directions. External
// detectors can be added as extra providers (see providers.ts).

export type ContentKind = "prose" | "poetry" | "code";

export interface Segment {
  start: number;
  end: number;
  /** Probability (0-1) that this passage is machine-generated. */
  ai: number;
  signals: string[];
}

export interface TextAnalysis {
  kind: ContentKind;
  /** Share of the text (0-1, weighted by length) that looks machine-generated. */
  aiShare: number;
  /** How much weight the score deserves (0-1). */
  confidence: number;
  words: number;
  segments: Segment[];
  signals: string[];
}

interface Span {
  start: number;
  end: number;
}

const MAX_CONFIDENCE: Record<ContentKind, number> = { prose: 0.55, poetry: 0.45, code: 0.4 };

export function analyzeText(text: string, kind: ContentKind): TextAnalysis {
  const words = countWords(text);
  if (words === 0) {
    return { kind, aiShare: 0, confidence: 0, words: 0, segments: [], signals: [] };
  }

  const spans = kind === "code" ? codeBlocks(text) : kind === "poetry" ? stanzas(text) : proseChunks(text);
  const docCode = kind === "code" ? codeDocFeatures(text) : null;
  const docCv = kind === "prose" ? lengthCv(spans.flatMap((s) => sentences(text, s)).map((s) => wordsIn(text, s))) : null;

  const segments = spans.map((span) => {
    const scored =
      kind === "code"
        ? scoreCode(text.slice(span.start, span.end), docCode)
        : kind === "poetry"
          ? scorePoetry(text.slice(span.start, span.end))
          : scoreProse(text, span, docCv);
    return { ...span, ai: round(scored.p), signals: scored.signals };
  });

  let weighted = 0;
  let total = 0;
  for (const seg of segments) {
    const len = seg.end - seg.start;
    weighted += len * softClass(seg.ai);
    total += len;
  }

  return {
    kind,
    aiShare: total ? round(weighted / total) : 0,
    confidence: round(lengthConfidence(words, kind) * (MAX_CONFIDENCE[kind] / 0.55)),
    words,
    segments,
    signals: topSignals(segments),
  };
}

/** Guess whether a block of text is prose, poetry or source code. */
export function detectKind(text: string, category: string): ContentKind {
  if (category === "poetry") return "poetry";
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "prose";
  const codeish = lines.filter((l) =>
    /[;{}]\s*$|^\s*(?:def|class|function|const|let|var|import|export|return|if|elif|for|while|#include|public|private|fn|func|package|async|await)\b|=>|\w\(\)|^\s*<\/?[a-z][\w-]*[\s>/]|^\s{2,}\S/.test(l),
  ).length;
  const ratio = codeish / lines.length;
  if (ratio > 0.4 || ((category === "code" || category === "website") && ratio > 0.2)) return "code";
  return "prose";
}

/** Merge several analyses (for example a public preview and the private deliverable). */
export function combineAnalyses(parts: TextAnalysis[]): { aiShare: number; confidence: number; words: number } | null {
  const used = parts.filter((p) => p.words > 0);
  if (used.length === 0) return null;
  const words = used.reduce((n, p) => n + p.words, 0);
  const aiShare = used.reduce((n, p) => n + p.aiShare * p.words, 0) / words;
  const main = used.reduce((a, b) => (b.words > a.words ? b : a));
  return {
    aiShare: round(aiShare),
    confidence: round(lengthConfidence(words, main.kind) * (MAX_CONFIDENCE[main.kind] / 0.55)),
    words,
  };
}

// ---------- prose ----------

function scoreProse(text: string, span: Span, docCv: number | null) {
  const body = text.slice(span.start, span.end);
  const lower = body.toLowerCase();
  const sents = sentences(text, span);
  const nWords = Math.max(countWords(body), 1);
  const signals: string[] = [];
  let z = -2.4;

  const markers = phraseHits(lower);
  const per100 = (markers.weight / nWords) * 100;
  z += 0.85 * Math.min(per100, 5);
  if (per100 >= 1) signals.push(`AI-typical vocabulary (${markers.found.slice(0, 3).join(", ")})`);

  const formulas = FORMULAS.filter((f) => f.pattern.test(body));
  z += 0.9 * Math.min(formulas.length, 3);
  if (formulas.length) signals.push(`Formulaic phrasing: ${formulas[0].label}`);

  if (sents.length >= 2) {
    const transitions = sents.filter((s) => TRANSITION_START.test(text.slice(s.start, s.end))).length;
    const ratio = transitions / sents.length;
    z += 2.0 * ratio;
    if (ratio >= 0.25) signals.push("Sentences stacked on transition words");
  }

  const cv = sents.length >= 4 ? lengthCv(sents.map((s) => wordsIn(text, s))) : docCv;
  if (cv !== null) {
    if (cv < 0.25) {
      z += 1.0;
      signals.push("Unusually even sentence lengths");
    } else if (cv < 0.38) {
      z += 0.45;
    } else if (cv > 0.75) {
      z -= 0.7;
      signals.push("Varied, uneven sentence rhythm (human-typical)");
    } else if (cv > 0.6) {
      z -= 0.3;
    }
  }

  const dashes = (body.match(/—/g) ?? []).length / Math.max(sents.length, 1);
  z += 1.0 * Math.min(dashes, 1.2);
  if (dashes >= 0.5) signals.push("Heavy em-dash use");

  const triplets = (body.match(/\b[\w-]+, [\w-]+,? and [\w-]+\b/g) ?? []).length;
  z += 0.3 * Math.min(triplets, 3);

  const human = (body.match(HUMAN_MARKERS) ?? []).length;
  z -= 0.8 * Math.min(human, 3);
  if (human) signals.push("Informal, conversational voice (human-typical)");

  const lowerStarts = sents.filter((s) => /^[a-z]/.test(text.slice(s.start, s.end))).length;
  z -= 0.5 * Math.min(lowerStarts, 2);

  return { p: sigmoid(z), signals };
}

// ---------- poetry ----------

function scorePoetry(stanza: string) {
  const lines = stanza.split("\n").map((l) => l.trim()).filter(Boolean);
  const lower = stanza.toLowerCase();
  const nWords = Math.max(countWords(stanza), 1);
  const signals: string[] = [];
  let z = -2.3;

  const cliches = POETIC_CLICHES.filter((c) => new RegExp(`\\b${escape(c)}\\b`).test(lower));
  const clichePer100 = (cliches.length / nWords) * 100;
  z += 0.7 * Math.min(clichePer100, 6);
  if (clichePer100 >= 3) signals.push(`Stock imagery (${cliches.slice(0, 3).join(", ")})`);

  const markers = phraseHits(lower);
  z += 0.6 * Math.min((markers.weight / nWords) * 100, 3);

  if (lines.length >= 4) {
    const cv = lengthCv(lines.map(countWords));
    if (cv !== null && cv < 0.18) {
      z += 0.9;
      signals.push("Very uniform line lengths");
    } else if (cv !== null && cv < 0.28) {
      z += 0.4;
    } else if (cv !== null && cv > 0.5) {
      z -= 0.5;
    }

    let pairs = 0;
    let rhymes = 0;
    for (let i = 0; i + 1 < lines.length; i += 2) {
      pairs++;
      if (rhyme(lastWord(lines[i]), lastWord(lines[i + 1]))) rhymes++;
    }
    const ratio = rhymes / pairs;
    z += 0.8 * ratio;
    if (ratio >= 0.75) signals.push("Strict rhyming couplets");
  }

  const human = (stanza.match(HUMAN_MARKERS) ?? []).length;
  z -= 0.6 * Math.min(human, 2);
  if (stanza === lower && /[a-z]/.test(stanza)) {
    z -= 0.7;
    signals.push("All-lowercase styling (human-typical)");
  }

  return { p: sigmoid(z), signals };
}

// ---------- code ----------

interface CodeDocFeatures {
  z: number;
  signals: string[];
}

// File-wide habits, scored once and applied to every block.
function codeDocFeatures(text: string): CodeDocFeatures {
  const signals: string[] = [];
  let z = 0;

  const fns = (text.match(/^\s*(?:def |(?:export )?(?:async )?function\b|fn )/gm) ?? []).length;
  const docs = (text.match(/"""[\s\S]*?"""|'''[\s\S]*?'''|\/\*\*[\s\S]*?\*\//g) ?? []).length;
  if (fns >= 2 && docs >= fns) {
    z += 0.8;
    signals.push("Docstring on every function");
  }

  if (/example usage|usage example|# example:|\/\/ example:/i.test(text)) {
    z += 0.8;
    signals.push("Tutorial-style “example usage” section");
  }

  if (/["'`][^"'`\n]*[\u{1F300}-\u{1FAFF}\u2705\u274C\u2728\u26A0][^"'`\n]*["'`]/u.test(text)) {
    z += 1.0;
    signals.push("Emoji inside log or print strings");
  }

  return { z, signals };
}

function scoreCode(block: string, doc: CodeDocFeatures | null) {
  const lines = block.split("\n");
  const commentLines = lines.filter((l) => /^\s*(?:\/\/|#(?!include|!)|\*|--|\/\*)/.test(l));
  const codeLines = lines.filter((l) => l.trim() && !commentLines.includes(l));
  const signals: string[] = [...(doc?.signals ?? [])];
  let z = -2.2 + (doc?.z ?? 0);

  if (commentLines.length >= 2) {
    const narrating = commentLines.filter((l) => NARRATING_COMMENT.test(l)).length / commentLines.length;
    z += 2.5 * narrating;
    if (narrating >= 0.4) signals.push("Comments narrate what each line does");
  }

  const density = commentLines.length / Math.max(lines.filter((l) => l.trim()).length, 1);
  if (density > 0.35) {
    z += 0.6;
    signals.push("Very high comment density");
  }

  const tells = lines.filter((l) => HUMAN_CODE_TELLS.test(l)).length;
  z -= 1.0 * Math.min(tells, 2);
  if (tells) signals.push("TODO/FIXME notes left in (human-typical)");

  const commentedOut = commentLines.filter((l) => /(?:\);?|=\s*[\w([{"']|\{|\})\s*$/.test(l.replace(/^\s*(?:\/\/|#)\s?/, ""))).length;
  z -= 0.6 * Math.min(commentedOut, 2);
  if (commentedOut) signals.push("Commented-out code (human-typical)");

  if (codeLines.length === 0) z -= 0.5;

  return { p: sigmoid(z), signals };
}

// ---------- segmentation ----------

function paragraphs(text: string): Span[] {
  const spans: Span[] = [];
  const sep = /\n[ \t]*\n\s*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = sep.exec(text))) {
    pushTrimmed(text, spans, last, m.index);
    last = m.index + m[0].length;
  }
  pushTrimmed(text, spans, last, text.length);
  return spans;
}

function proseChunks(text: string): Span[] {
  const out: Span[] = [];
  for (const para of paragraphs(text)) {
    const sents = sentences(text, para);
    if (sents.length <= 5) {
      out.push(para);
      continue;
    }
    for (let i = 0; i < sents.length; i += 4) {
      const group = sents.slice(i, i + 4);
      // Fold a lone trailing sentence into the previous chunk.
      if (group.length === 1 && out.length) {
        out[out.length - 1] = { start: out[out.length - 1].start, end: group[0].end };
      } else {
        out.push({ start: group[0].start, end: group[group.length - 1].end });
      }
    }
  }
  return out;
}

function stanzas(text: string): Span[] {
  const out: Span[] = [];
  for (const stanza of paragraphs(text)) {
    const lines = lineSpans(text, stanza);
    if (lines.length <= 8) {
      out.push(stanza);
      continue;
    }
    for (let i = 0; i < lines.length; i += 6) {
      const group = lines.slice(i, i + 6);
      out.push({ start: group[0].start, end: group[group.length - 1].end });
    }
  }
  return out;
}

// Windows of roughly 25-50 lines, cut at a blank line where possible, so a
// function stays together with its docstring and comments.
function codeBlocks(text: string): Span[] {
  const lines = lineSpans(text, { start: 0, end: text.length });
  const out: Span[] = [];
  let first = 0;
  for (let i = 0; i < lines.length; i++) {
    const size = i - first + 1;
    const gapAfter = i + 1 < lines.length && /\n[ \t]*\n/.test(text.slice(lines[i].end, lines[i + 1].start));
    if ((size >= 25 && gapAfter) || size >= 50) {
      out.push({ start: lines[first].start, end: lines[i].end });
      first = i + 1;
    }
  }
  if (first < lines.length) {
    const tail = { start: lines[first].start, end: lines[lines.length - 1].end };
    // Fold a short tail into the previous window.
    if (out.length && lines.length - first < 8) out[out.length - 1].end = tail.end;
    else out.push(tail);
  }
  return out;
}

function sentences(text: string, span: Span): Span[] {
  const out: Span[] = [];
  const slice = text.slice(span.start, span.end);
  const re = /[^.!?…\n]+(?:[.!?…]+["'”’)\]]*|\n|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    pushTrimmed(text, out, span.start + m.index, span.start + m.index + m[0].length);
  }
  return out.filter((s) => countWords(text.slice(s.start, s.end)) > 0);
}

function lineSpans(text: string, span: Span): Span[] {
  const out: Span[] = [];
  let start = span.start;
  for (let i = span.start; i <= span.end; i++) {
    if (i === span.end || text[i] === "\n") {
      pushTrimmed(text, out, start, i);
      start = i + 1;
    }
  }
  return out;
}

function pushTrimmed(text: string, spans: Span[], s: number, e: number) {
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  if (e > s) spans.push({ start: s, end: e });
}

// ---------- helpers ----------

function phraseHits(lower: string) {
  let weight = 0;
  const found: string[] = [];
  for (const phrase of STRONG_AI_PHRASES) {
    const n = (lower.match(new RegExp(`\\b${escape(phrase)}\\b`, "g")) ?? []).length;
    if (n) {
      weight += n;
      found.push(phrase);
    }
  }
  for (const word of WEAK_AI_WORDS) {
    const n = (lower.match(new RegExp(`\\b${escape(word)}\\b`, "g")) ?? []).length;
    if (n) {
      weight += 0.35 * n;
      found.push(word);
    }
  }
  return { weight, found };
}

function countWords(s: string) {
  return (s.match(/[A-Za-z0-9À-ɏ']+/g) ?? []).length;
}

function wordsIn(text: string, span: Span) {
  return countWords(text.slice(span.start, span.end));
}

function lengthCv(lengths: number[]): number | null {
  const xs = lengths.filter((n) => n > 0);
  if (xs.length < 3) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance) / mean;
}

// Poems are short by nature, so they reach each confidence step sooner.
function lengthConfidence(words: number, kind: ContentKind) {
  const n = kind === "poetry" ? words / 0.6 : words;
  if (n < 40) return 0.1;
  if (n < 100) return 0.22;
  if (n < 250) return 0.35;
  if (n < 600) return 0.45;
  return 0.55;
}

function lastWord(line: string) {
  const m = line.toLowerCase().match(/([a-z']+)[^a-z']*$/);
  return m ? m[1] : "";
}

function rhyme(a: string, b: string) {
  if (!a || !b || a === b) return false;
  const n = Math.min(a.length, b.length) <= 3 ? 2 : 3;
  return a.slice(-n) === b.slice(-n);
}

function topSignals(segments: Segment[]) {
  const counts = new Map<string, number>();
  for (const seg of segments) {
    for (const s of seg.signals) {
      const key = s.replace(/ \(.*\)$/, "");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([s]) => s);
}

// Maps a passage probability to how much of it counts as machine-generated.
// Passages below 0.35 count as human, above 0.65 as fully generated.
function softClass(p: number) {
  return Math.min(1, Math.max(0, (p - 0.35) / 0.3));
}

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
