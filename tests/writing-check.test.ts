import { describe, expect, it } from "vitest";
import { analyzeText } from "../src/lib/analysis/text";
import { EXAMPLE_TEXT, isFlagged, isStrong, patternLevel, patternPercent, reasonsFlagged } from "../src/lib/writing-check";

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
    expect([0, 5, 6, 20, 21, 50, 51, 100].map(patternLevel)).toEqual(["few", "few", "some", "some", "many", "many", "most", "most"]);
  });

  it("never lists a human-typical habit as a reason for a flag", () => {
    for (const segment of segments) {
      expect(reasonsFlagged(segment).some((reason) => reason.includes("human-typical"))).toBe(false);
    }
  });
});
