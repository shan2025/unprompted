import { describe, expect, it } from "vitest";
import { parseWorkLink } from "@/lib/work-link";

describe("parseWorkLink", () => {
  it("reads paths and full links to posts and listings", () => {
    expect(parseWorkLink("/journal/three-mornings")).toEqual({ kind: "post", slug: "three-mornings" });
    expect(parseWorkLink("journal/three-mornings/")).toEqual({ kind: "post", slug: "three-mornings" });
    expect(parseWorkLink("https://unprompters.com/listing/Blue-Bowl?ref=x#top")).toEqual({ kind: "listing", slug: "blue-bowl" });
  });

  it("rejects anything else", () => {
    expect(parseWorkLink("")).toBeNull();
    expect(parseWorkLink("/u/mara")).toBeNull();
    expect(parseWorkLink("/journal/new")).toBeNull();
    expect(parseWorkLink("/journal/a/b")).toBeNull();
  });
});
