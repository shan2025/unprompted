import type { NextConfig } from "next";
import { CATEGORY_IDS } from "./src/lib/categories";

// Crawlers that read the raw HTML without running scripts get each page's title,
// description and canonical link inside <head>; everyone else gets them streamed.
// Setting this replaces Next's own list, so its entries are copied here first
// (node_modules/next/dist/shared/lib/router/utils/html-bots.js), then the AI crawlers.
const NEXT_DEFAULT_BOTS =
  "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight";
const AI_BOTS =
  "GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Amazonbot|meta-externalagent|Bytespider|cohere-ai|MistralAI-User|DuckAssistBot|YouBot";

const nextConfig: NextConfig = {
  htmlLimitedBots: new RegExp(`${NEXT_DEFAULT_BOTS}|${AI_BOTS}`, "i"),
  cacheComponents: true,
  partialPrefetching: true,
  // Baseline browser protections on every page: no other site may show ours in
  // a frame (clickjacking), browsers don't guess file types, links to other
  // sites don't reveal which page they came from, and pages can't use the
  // camera, microphone or location. The file route is left out because it
  // sets its own, stricter policy for PDFs.
  async headers() {
    return [
      {
        source: "/((?!api/files/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Pages that show a creator's work carry the "don't train AI on this" label,
      // alongside the robots.txt rules (src/lib/ai-crawlers.ts). Search engines ignore it.
      ...["/journal/:slug", "/listing/:slug", "/u/:handle"].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noai, noimageai" }],
      })),
    ];
  },
  // One craft has its own page now (src/lib/browse.ts), so old single-craft
  // filter links move there for good. Several crafts stay a filter.
  async redirects() {
    return (["explore", "marketplace"] as const).map((page) => ({
      source: `/${page}`,
      has: [{ type: "query" as const, key: "category", value: `(?<cat>${CATEGORY_IDS.join("|")})` }],
      destination: `/${page}/:cat`,
      permanent: true,
    }));
  },
  experimental: {
    serverActions: {
      // Listings can include an image of up to 4 MB; Vercel caps requests at 4.5 MB.
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
