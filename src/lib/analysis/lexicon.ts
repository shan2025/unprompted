// Word lists behind the built-in analyzer. They describe statistical habits
// of large language models, not proof of anything: people use every one of
// these words too. They only matter in aggregate and at high density.

// Phrases that are rare in human writing and common in model output.
export const STRONG_AI_PHRASES = [
  "delve",
  "delves",
  "delving",
  "tapestry",
  "testament to",
  "it's important to note",
  "it is important to note",
  "it's worth noting",
  "it is worth noting",
  "in today's fast-paced",
  "in today's digital",
  "in the realm of",
  "navigate the complexities",
  "navigating the complexities",
  "ever-evolving",
  "ever-changing landscape",
  "evolving landscape",
  "a myriad of",
  "plays a crucial role",
  "plays a vital role",
  "plays a pivotal role",
  "look no further",
  "key takeaways",
  "harness the power",
  "unlock the potential",
  "unlock the full potential",
  "embark on",
  "embarking on",
  "as an ai",
  "i hope this helps",
  "rich tapestry",
  "stands as a",
  "serves as a testament",
  "a beacon of",
  "the intricacies of",
  "elevate your",
  "seamlessly integrate",
  "whether you're a seasoned",
];

// Ordinary words that models overuse. Each hit counts for much less.
export const WEAK_AI_WORDS = [
  "moreover",
  "furthermore",
  "additionally",
  "seamless",
  "seamlessly",
  "robust",
  "leverage",
  "leveraging",
  "pivotal",
  "multifaceted",
  "nuanced",
  "vibrant",
  "intricate",
  "foster",
  "fostering",
  "underscore",
  "underscores",
  "showcasing",
  "elevate",
  "elevating",
  "transformative",
  "holistic",
  "realm",
  "landscape",
  "profound",
  "invaluable",
  "meticulous",
  "meticulously",
  "captivating",
  "resonate",
  "resonates",
  "boasts",
  "bustling",
  "comprehensive",
  "crucial",
  "paramount",
  "streamline",
  "empower",
  "empowering",
  "beacon",
  "interplay",
  "unwavering",
  "endeavor",
  "enhance",
  "enhancing",
  "innovative",
  "cutting-edge",
  "game-changer",
  "insightful",
];

// Rhetorical templates that models reach for.
export const FORMULAS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bnot (?:just|only|merely|simply) [^.!?]{2,80}?\bbut (?:also )?/i, label: "“not just… but” construction" },
  {
    pattern: /\b(?:it'?s|this is|that'?s|it isn'?t) not (?:just )?(?:about )?[^.!?]{2,50}?[,;—–-]\s*(?:it'?s|but)\b/i,
    label: "“it's not X, it's Y” construction",
  },
  { pattern: /\bwhether you'?re (?:a|an|just)\b/i, label: "“whether you're a…” opener" },
  { pattern: /\bin today'?s\b/i, label: "“in today's…” opener" },
  { pattern: /\blet'?s (?:dive|delve|explore|unpack|break (?:it|this) down)\b/i, label: "“let's dive in” phrasing" },
  { pattern: /(?:^|\n)\s*(?:in conclusion|in summary|to sum up)\b/i, label: "summary sign-off" },
  { pattern: /\bthe (?:best|key|real) part\?/i, label: "rhetorical “the best part?” beat" },
  { pattern: /^\s*(?:[-*•]|\d+\.)\s+\*\*[^*\n]+\*\*:?/m, label: "bullet list with bold lead-ins" },
];

// ---------- essay signals ----------
// Newer models rarely use the stock phrases above. What they still do is build
// an essay the same way every time. These are used only when a text is checked
// as an essay (the free writing check), and only add up in combination.

// Set phrases of the reflective, tidy-moral voice. These are widely reported
// habits of current models, not phrases lifted from one sample: an early
// version keyed on "took on a different meaning", which turned out to be a
// human writer's own line that a model had kept while rewriting their essay.
// `overlaps` marks the ones FORMULAS already catches in some wordings, so the
// same sentence is never counted twice.
export const ESSAY_FORMULAS: { pattern: RegExp; label: string; overlaps?: boolean }[] = [
  { pattern: /\b(?:is|are|was|were|does|do|did)n'?t (?:just|only|merely|simply)\b[^.!?]{2,80}?,? but\b/i, label: "“isn't just… but” construction" },
  {
    pattern: /\b(?:is|are|was|were)(?:n'?t| not) (?:just |only |simply )?about [^.!?]{2,60}[.,;]\s*(?:but|it(?:'s| is)|they(?:'re| are))\b/i,
    label: "“it's not about X, it's about Y” turn",
    overlaps: true,
  },
  { pattern: /\bmore than just\b|\bmore than (?:a|an) (?:way|tool|job|skill|hobby|place|means|habit|trend)\b/i, label: "“more than just” phrasing" },
  { pattern: /\b(?:that'?s|that is|this is) (?:exactly |precisely )?what makes\b/i, label: "“that's what makes it…” closer" },
  { pattern: /\bwhat makes (?:it|them|this|these|that|those|[a-z]+ [a-z]+) (?:so )?(?:special|unique|different|meaningful|valuable|powerful|worthwhile)\b/i, label: "“what makes it special” closer" },
  { pattern: /\bin a world (?:where|that|full of|filled with)\b/i, label: "“in a world where…” framing" },
  { pattern: /\bat (?:its|their) core\b|\bat the heart of\b/i, label: "“at its core” phrasing" },
  { pattern: /\b(?:reminds|reminding) (?:us|readers) that\b|\ba reminder that\b/i, label: "“a reminder that…” moral" },
  { pattern: /(?:^|[.!?]\s+)(?:In the end|Ultimately|Looking back|At the end of the day),/i, label: "wrap-up opener (“In the end,” “Ultimately,”)" },
  { pattern: /\b(?:sets?|setting) the tone\b|\bplays? an? (?:important|key|central|vital|crucial|major) role\b|\blaid the foundation\b|\bopens? the door to\b/i, label: "stock expression (“plays an important role”)" },
  { pattern: /\bone of (?:our|the) most (?:valuable|important|powerful) (?:resources|tools|skills|gifts|things)\b|\bthe kind of (?:life|person|world) (?:we|you|they)\b/i, label: "sweeping closing claim" },
];

// "A, B, and C": the list of three (or four) that models reach for constantly.
export const SERIAL_LIST = /(?:\b[^,.;:!?()]{2,45},\s+){2,}(?:and|or)\s+\w/g;

// Signpost words opening a sentence. People use them too; models stack them.
export const SIGNPOST_START =
  /^(?:Yet|Still|Instead|Today|Often|Ultimately|Finally|Next|However|Moreover|Overall|Over time|In many ways|At the same time|In the end|After all|In fact|For many|Even so|In short|Simply put|More importantly|As a result|At first|Looking back),/;

export const TRANSITION_START =
  /^(?:additionally|furthermore|moreover|however|overall|ultimately|importantly|notably|in addition|consequently|thus|therefore|in essence|essentially|indeed|conversely|similarly|that said|in fact),/i;

// Things models rarely produce unprompted.
export const HUMAN_MARKERS =
  /\b(?:lol|lmao|tbh|idk|imo|gonna|wanna|gotta|kinda|sorta|yeah|yep|nope|nah|ugh|meh|haha|hah|dude|anyway|whatever|damn|crap|heck|y'all|ain't|dunno|lemme|gimme)\b|!!|\?!|:\)|:\(|\*sigh\*/gi;

// Imagery that model-written poems lean on heavily.
export const POETIC_CLICHES = [
  "whisper",
  "whispers",
  "whispering",
  "whispered",
  "tapestry",
  "symphony",
  "ethereal",
  "celestial",
  "embrace",
  "embraces",
  "echo",
  "echoes",
  "eternal",
  "boundless",
  "solace",
  "serene",
  "hues",
  "twilight",
  "ember",
  "embers",
  "velvet",
  "cascade",
  "cascading",
  "luminous",
  "yearning",
  "gentle",
  "tender",
  "soar",
  "soaring",
  "take flight",
  "takes flight",
  "hearts entwined",
  "the stars above",
  "beneath the",
  "in the quiet",
  "softly",
  "endless",
  "infinite",
  "radiant",
  "shimmer",
  "shimmering",
  "golden light",
  "silver moon",
  "dreams",
];

// Comments that narrate what the next line obviously does.
export const NARRATING_COMMENT =
  /^\s*(?:\/\/|#|\*|--|\/\*)\s*(?:initiali[sz]e|create|define|import|loop (?:through|over)|iterate|check if|checks if|return(?:s)? the|set up|get the|calculate|increment|call|add the|update the|print|helper function|main function|function to|this function|step \d)/i;

export const HUMAN_CODE_TELLS = /\b(?:TODO|FIXME|HACK|XXX|WTF|KLUDGE)\b|\b(?:lol|idk|ugh|dunno)\b/;
