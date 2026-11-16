import { describe, expect, it } from "vitest";
import { analyzeText } from "../src/lib/analysis/text";
import { EXAMPLE_TEXT, isFlagged, isStrong, reasonsFlagged } from "../src/lib/writing-check";

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

  it("never lists a human-typical habit as a reason for a flag", () => {
    for (const segment of segments) {
      expect(reasonsFlagged(segment).some((reason) => reason.includes("human-typical"))).toBe(false);
    }
  });
});
