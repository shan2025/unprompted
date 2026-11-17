import { describe, expect, it } from "vitest";
import { analyzeText } from "../src/lib/analysis/text";
import { EXAMPLE_TEXT, isFlagged, isMild, isStrong, patternLevel, patternPercent, reasonsFlagged } from "../src/lib/writing-check";

describe("the free writing check", () => {
  const { segments } = analyzeText(EXAMPLE_TEXT, "prose");
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
  });

  it("gives the share of the text that looks machine-made as a whole percent", () => {
    const percent = patternPercent(analyzeText(EXAMPLE_TEXT, "prose"));
    // One of the two paragraphs is flagged, and it is the longer one.
    expect(percent).toBeGreaterThan(40);
    expect(percent).toBeLessThan(70);
    expect(patternPercent(analyzeText(EXAMPLE_TEXT.split("\n\n")[1], "prose"))).toBe(0);
  });

  it("labels the percentage in the site's tier steps", () => {
    expect([6, 20, 21, 50, 51, 100].map((percent) => patternLevel(percent, 0))).toEqual(["some", "some", "many", "many", "most", "most"]);
  });

  it("has no clean level: a low score is either no obvious patterns or mild ones", () => {
    expect(patternLevel(0, 0)).toBe("none");
    expect(patternLevel(0, 2)).toBe("mild");
    expect(patternLevel(5, 1)).toBe("mild");
  });

  // Plain, polished prose with none of the listed phrases: the case a trained detector may flag and this check can't.
  const POLISHED = `Industrialization changed the way the world made things. Machines made it possible to produce goods faster, cheaper, and on a much larger scale. Many traditional livelihoods and businesses were affected along the way. Yet, even as mass production became the norm, handmade and handcrafted objects never really lost their place. If anything, their value took on a different meaning.

When almost everything could be manufactured quickly and cheaply, the things made by human hands began to stand apart. People continued to appreciate the craftsmanship, the imperfections, the individuality, and the hours of work that went into creating something by hand. A machine could reproduce an object, but the experience, skill, and perspective of the person who made it were something else entirely.`;

  it("reports mild patterns in polished prose instead of hiding them behind 0%", () => {
    const analysis = analyzeText(POLISHED, "prose");
    expect(patternPercent(analysis)).toBe(0);
    expect(analysis.segments.every(isMild)).toBe(true);
    expect(analysis.segments.some(isFlagged)).toBe(false);
  });

  it("doesn't call plain casual writing mild", () => {
    expect(isMild(human)).toBe(false);
  });

  it("never lists a human-typical habit as a reason for a flag", () => {
    for (const segment of segments) {
      expect(reasonsFlagged(segment).some((reason) => reason.includes("human-typical"))).toBe(false);
    }
  });
});
