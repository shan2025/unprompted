import { describe, expect, it } from "vitest";
import { parseVideoLink, videoEmbed } from "@/lib/video";

const YT = "dQw4w9WgXcQ";

describe("parseVideoLink", () => {
  it.each([
    `https://www.youtube.com/watch?v=${YT}`,
    `https://youtube.com/watch?v=${YT}&t=30s`,
    `https://m.youtube.com/watch?v=${YT}`,
    `https://youtu.be/${YT}?si=abc`,
    `youtu.be/${YT}`,
    `https://www.youtube.com/shorts/${YT}`,
    `https://www.youtube.com/embed/${YT}`,
    `https://www.youtube.com/live/${YT}`,
    `  https://www.youtube.com/watch?v=${YT}  `,
  ])("tidies the YouTube link %s", (link) => {
    expect(parseVideoLink(link)).toBe(`https://www.youtube.com/watch?v=${YT}`);
  });

  it("keeps the private hash on unlisted Vimeo videos", () => {
    expect(parseVideoLink("https://vimeo.com/76979871")).toBe("https://vimeo.com/76979871");
    expect(parseVideoLink("https://vimeo.com/76979871/abc123def0")).toBe("https://vimeo.com/76979871/abc123def0");
    expect(parseVideoLink("https://player.vimeo.com/video/76979871?h=abc123def0")).toBe("https://vimeo.com/76979871/abc123def0");
  });

  it.each([
    "",
    "not a link",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evil.example/youtu.be/dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/playlist?list=PL123",
    "https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://vimeo.com/channels/staffpicks",
    "https://vimeo.com/76979871/<script>",
  ])("rejects %s", (link) => {
    expect(parseVideoLink(link)).toBeNull();
  });
});

describe("videoEmbed", () => {
  it("uses YouTube's reduced-tracking player, with a thumbnail", () => {
    expect(videoEmbed(`https://www.youtube.com/watch?v=${YT}`)).toEqual({
      provider: "YouTube",
      src: `https://www.youtube-nocookie.com/embed/${YT}`,
      thumbnail: `https://i.ytimg.com/vi/${YT}/hqdefault.jpg`,
    });
  });

  it("asks Vimeo not to track viewers and keeps the private hash", () => {
    expect(videoEmbed("https://vimeo.com/76979871/abc123def0")).toEqual({
      provider: "Vimeo",
      src: "https://player.vimeo.com/video/76979871?dnt=1&h=abc123def0",
      thumbnail: null,
    });
  });

  it("returns nothing for a link it can't read", () => {
    expect(videoEmbed("https://example.com/video")).toBeNull();
  });
});
