import { SERIAL_LIST } from "./lexicon";

type Span = { start: number; end: number };

/** Keep UTF-16 offsets aligned with the paste so highlights still quote the original. */
export function readEssay(source: string) {
  const breaks: number[] = [];
  let offset = 0;
  let entries = 0;
  // Spaces in place of CR keep both the source offsets and blank-line splitting stable.
  const lines = source.replace(/\r(?=\n)/g, " ").split("\n");
  const cleaned = lines.map((line, i) => {
    const start = offset;
    offset += line.length + 1;
    const plain = line.replace(/\*\*|__/g, "").trim();
    const numbered = /^\d+[.)]\s+/.test(plain);
    const listItem = numbered || /^[-*•]\s+/.test(plain);
    if (listItem) entries++;

    // Also accept headings copied from rendered HTML, which arrive without hashes.
    const isolated = !lines[i - 1]?.trim() && !lines[i + 1]?.trim();
    const title = lines.length > 1 && isolated && /^[A-Z][^.!?;]{0,75}[^.!?;:]\??$/.test(plain) && plain.split(/\s+/).length <= 10;
    const tableRow = /^\|.*\|$/.test(plain) || /\S\t+[^\t]+\t+\S/.test(line);
    if (/^#{1,6}\s/.test(plain) || title || tableRow) {
      breaks.push(start);
      return " ".repeat(line.length);
    }
    if (numbered && !/[.!?:]$/.test(plain) && !plain.includes(":") && plain.split(/\s+/).length <= 9) {
      return " ".repeat(line.length);
    }

    // Mask list numbers, short labels, and emphasis without creating phantom sentences.
    const mask = (s: string) => " ".repeat(s.length);
    let body = line.replace(/\*\*|__/g, mask);
    if (listItem) {
      body = body.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, mask).replace(/^\s*[^:.!?\n]{1,60}:\s+/, mask);
    }
    return body;
  }).join("\n");
  return { text: cleaned, breaks, outlined: breaks.length >= 2 || entries >= 3 };
}

/** Read short blocks in section context. Keep long passages and section boundaries intact. */
export function groupEssaySpans(spans: Span[], breaks: number[], words: (s: Span) => number) {
  const result: Span[] = [];
  let size = 0;
  let nextBreak = 0;
  for (const span of spans) {
    let newSection = false;
    while (nextBreak < breaks.length && breaks[nextBreak] < span.start) {
      nextBreak++;
      newSection = true;
    }
    const length = words(span);
    if (result.length && !newSection && size < 100 && length + size <= 160 && (length < 55 || size < 25)) {
      result[result.length - 1].end = span.end;
      size += length;
    } else {
      result.push({ ...span });
      size = length;
    }
  }
  return result;
}

// These are ordinary expository habits. Count a combination only when each
// habit is also present elsewhere in the document, and only in matching prose.
const ARTICLE_HABITS = [
  {
    pattern: /\b(?:at (?:its|their) core|(?:has|have) evolved (?:into|from)|one of the most (?:important|significant|prominent|influential)|(?:offers?|faces?|through|has) several (?:\w+ ){0,2}(?:benefits|features|advantages|challenges|processes|characteristics)|(?:represents?|marks?) a (?:fundamental|major|significant) shift|plays? an? (?:important|key|central|crucial) role|(?:is|are) no longer limited to)\b/i,
    label: "Broad framing repeated across passages",
  },
  {
    pattern: /\b(?:can|could|may) (?:also |potentially )?(?:help|improve|reduce|enable|support|facilitate|provide|enhance|create|allow|simplify|increase|promote)\b/i,
    label: "Repeated claims about potential benefits",
  },
  {
    pattern: /(?:^|[.!?]\s+|\n\s*)(?:for (?:example|instance)|as a result|in other words|to illustrate),/i,
    label: "Repeated explanatory lead-ins",
  },
  {
    pattern: new RegExp(SERIAL_LIST.source),
    label: "Three-part lists recur across passages",
  },
];

export function recurringArticleSignals(text: string, spans: Span[], words: number): string[][] {
  if (words < 200 || spans.length < 3) return [];
  const matches = spans.map(({ start, end }) => {
    const passage = text.slice(start, end).trim();
    return ARTICLE_HABITS.filter(({ pattern }) => pattern.test(passage));
  });
  const recurring = ARTICLE_HABITS.filter((habit) => matches.filter((local) => local.includes(habit)).length >= 2);
  if (recurring.length < 3) return [];
  return matches.map((local) => {
    const reasons = local.filter((habit) => recurring.includes(habit));
    return reasons.length >= 2 ? reasons.map(({ label }) => label) : [];
  });
}
