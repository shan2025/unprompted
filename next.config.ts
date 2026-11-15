import type { NextConfig } from "next";

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
