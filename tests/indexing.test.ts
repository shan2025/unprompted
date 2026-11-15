import { describe, expect, it } from "vitest";
import { MIN_INDEXED_WORDS, wordCount, worthIndexing } from "@/lib/indexing";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const post = (over: Partial<Parameters<typeof worthIndexing>[0]>) => ({ subtitle: "", body: "", coverFile: null, videoUrl: null, ...over });

describe("wordCount", () => {
  it("counts words across any whitespace", () => {
    expect(wordCount("  one\ntwo\t three  ")).toBe(3);
    expect(wordCount("   ")).toBe(0);
  });
});

describe("worthIndexing", () => {
  it("keeps short writing with nothing to look at out of search", () => {
    expect(worthIndexing(post({ body: "Just testing this out." }))).toBe(false);
    expect(worthIndexing(post({ body: words(MIN_INDEXED_WORDS - 1) }))).toBe(false);
  });

  it("lists writing of a real length", () => {
    expect(worthIndexing(post({ body: words(MIN_INDEXED_WORDS) }))).toBe(true);
  });

  it("counts the subtitle with the writing", () => {
    expect(worthIndexing(post({ subtitle: words(20), body: words(MIN_INDEXED_WORDS - 20) }))).toBe(true);
  });

  it("lists a photo or video post however short its words", () => {
    expect(worthIndexing(post({ coverFile: "abc.webp" }))).toBe(true);
    expect(worthIndexing(post({ videoUrl: "https://www.youtube.com/watch?v=x" }))).toBe(true);
  });
});
