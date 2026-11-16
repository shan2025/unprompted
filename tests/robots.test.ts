import { describe, expect, it } from "vitest";
import robots from "../src/app/robots";
import { AI_TRAINING_CRAWLERS, CREATOR_WORK_PATHS } from "../src/lib/ai-crawlers";

const rules = [robots().rules].flat();
const everyone = rules.find((r) => r.userAgent === "*")!;
const training = rules.find((r) => Array.isArray(r.userAgent))!;
const blocked = (rule: typeof everyone) => [rule.disallow ?? []].flat();

describe("robots.txt", () => {
  it("keeps creators' work away from AI training crawlers", () => {
    expect(training.userAgent).toEqual(AI_TRAINING_CRAWLERS);
    for (const path of CREATOR_WORK_PATHS) expect(blocked(training)).toContain(path);
  });

  it("still lets search engines and AI search read the work", () => {
    for (const path of CREATOR_WORK_PATHS) expect(blocked(everyone)).not.toContain(path);
    for (const bot of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot"]) {
      expect(AI_TRAINING_CRAWLERS).not.toContain(bot);
    }
  });

  it("leaves the pages about Unprompters open to every crawler", () => {
    for (const open of ["/", "/about", "/standard", "/ai-writing-check"]) {
      expect(blocked(training).some((path) => path === open)).toBe(false);
    }
  });

  it("keeps private pages blocked for training crawlers too, since they only read their own group", () => {
    for (const path of blocked(everyone)) expect(blocked(training)).toContain(path);
  });
});
