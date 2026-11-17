import { describe, expect, it } from "vitest";
import { analyzeText } from "../src/lib/analysis/text";
import { checkWriting, EXAMPLE_TEXT, isFlagged, isMild, isStrong, patternLevel, patternPercent, reasonsFlagged } from "../src/lib/writing-check";
import { CASUAL_HUMAN, THOREAU } from "./fixtures";

// A human essay rewritten by ChatGPT (17 November 2026). It has none of the
// old stock phrases, so the standard scan gives it 0%. QuillBot called it
// "100% AI-generated" and GPTZero "human-written, polished with AI".
const AI_REWRITE = `Industrialization changed the way the world made things. Machines made it possible to produce goods faster, cheaper, and on a much larger scale. Many traditional livelihoods and businesses were affected along the way. Yet, even as mass production became the norm, handmade and handcrafted objects never really lost their place. If anything, their value took on a different meaning.

When almost everything could be manufactured quickly and cheaply, the things made by human hands began to stand apart. People continued to appreciate the craftsmanship, the imperfections, the individuality, and the hours of work that went into creating something by hand. A machine could reproduce an object, but the experience, skill, and perspective of the person who made it were something else entirely.

Behind these creations are years of learning, experimentation, research, and countless hours spent bringing different ideas together. Sometimes, it takes a person an entire lifetime to master a craft. And I think that's what makes these objects special. Their value isn't simply in what they are, but in everything that went into making them.`;

// A short essay written by an AI model in its plain default voice, for this test.
const PLAIN_AI = `Reading has always been more than a way to pass the time. It gives us access to lives we will never live and places we will never see. When we open a book, we step into someone else's mind, and that experience changes how we understand our own.

In a world full of short videos and constant notifications, sitting with a book can feel difficult. Our attention is pulled in many directions, and slow, focused reading asks for something we rarely give: patience. Yet that patience is exactly what makes reading valuable. It trains us to follow an argument, to stay with a character, and to think before we react.

Reading also builds empathy. Stories let us feel the fears, hopes, and doubts of people who are nothing like us. Over time, this makes us more thoughtful and more open. In the end, reading isn't just about gaining knowledge. It's about becoming a more curious and understanding person.`;

describe("the free writing check", () => {
  const { segments } = checkWriting(EXAMPLE_TEXT, "prose");
  const [machine, human] = segments;

  it("splits the example into its two paragraphs", () => {
    expect(segments).toHaveLength(2);
  });

  it("flags the machine-style paragraph and says why", () => {
    expect(isFlagged(machine)).toBe(true);
    expect(isStrong(machine)).toBe(true);
    expect(reasonsFlagged(machine).length).toBeGreaterThan(0);
  });

  it("leaves the casual paragraph alone", () => {
    expect(isFlagged(human)).toBe(false);
    expect(isMild(human)).toBe(false);
  });

  it("gives the share of the text that shows clear patterns as a whole percent", () => {
    const percent = patternPercent(checkWriting(EXAMPLE_TEXT, "prose"));
    // One of the two paragraphs is flagged, and it is the longer one.
    expect(percent).toBeGreaterThan(40);
    expect(percent).toBeLessThan(70);
    expect(patternPercent(checkWriting(EXAMPLE_TEXT.split("\n\n")[1], "prose"))).toBe(0);
  });

  it("labels the percentage in the site's tier steps", () => {
    expect([6, 20, 21, 50, 51, 100].map((percent) => patternLevel(percent, 0))).toEqual(["some", "some", "many", "many", "most", "most"]);
  });

  it("has no clean level: a low score is either no obvious patterns or mild ones", () => {
    expect(patternLevel(0, 0)).toBe("none");
    expect(patternLevel(0, 2)).toBe("mild");
    expect(patternLevel(5, 1)).toBe("mild");
  });

  it("never lists a human-typical habit as a reason for a flag", () => {
    for (const segment of segments) {
      expect(reasonsFlagged(segment).some((reason) => reason.includes("human-typical"))).toBe(false);
    }
  });
});

describe("plain modern AI prose, with none of the old stock phrases", () => {
  it("is caught by the essay rules: every passage of the ChatGPT rewrite is flagged", () => {
    const analysis = checkWriting(AI_REWRITE, "prose");
    expect(analysis.segments.every(isFlagged)).toBe(true);
    expect(patternPercent(analysis)).toBeGreaterThanOrEqual(30);
  });

  it("is caught in an essay on a different subject", () => {
    const analysis = checkWriting(PLAIN_AI, "prose");
    expect(analysis.segments.every(isFlagged)).toBe(true);
    expect(patternPercent(analysis)).toBeGreaterThanOrEqual(40);
  });

  it("names the habits it found, and only when several appear together", () => {
    const reasons = checkWriting(AI_REWRITE, "prose").segments.flatMap(reasonsFlagged);
    expect(reasons).toContain("No names, numbers or concrete details");
    expect(reasons).toContain("Paragraphs of nearly equal length");
  });

  it("is still 0% in the standard scan that posts and listings use, which stays as it was", () => {
    expect(patternPercent(analyzeText(AI_REWRITE, "prose"))).toBe(0);
    expect(patternPercent(analyzeText(PLAIN_AI, "prose"))).toBe(0);
  });
});

describe("human writing under the essay rules", () => {
  it("doesn't flag Thoreau, who names no names either", () => {
    const analysis = checkWriting(THOREAU, "prose");
    expect(analysis.segments.some(isFlagged)).toBe(false);
    expect(patternPercent(analysis)).toBe(0);
  });

  it("doesn't flag casual first-person writing", () => {
    const analysis = checkWriting(CASUAL_HUMAN, "prose");
    expect(analysis.segments.some(isFlagged)).toBe(false);
    expect(analysis.segments.some(isMild)).toBe(false);
  });

  it("leaves poetry to the poetry rules", () => {
    expect(checkWriting("the kettle clicks off\nand nobody moves", "poetry").kind).toBe("poetry");
  });
});
