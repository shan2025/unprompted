// Crawlers that collect pages to train AI models. robots.txt asks them to stay
// away from the work people share here. It is a request, which these companies
// say they follow, not a lock: a scraper that ignores robots.txt isn't stopped.
//
// Crawlers that fetch a page to answer someone's question and link back to it
// (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot)
// and ordinary search engines are deliberately NOT on this list, so creators'
// work can still be found and cited.
export const AI_TRAINING_CRAWLERS = [
  "GPTBot", // OpenAI
  "ClaudeBot", // Anthropic
  "anthropic-ai", // Anthropic (older name)
  "Google-Extended", // Google's AI training opt-out; Google Search is unaffected
  "Applebot-Extended", // Apple's AI training opt-out; Applebot search is unaffected
  "CCBot", // Common Crawl, the source of many training sets
  "meta-externalagent", // Meta
  "FacebookBot", // Meta
  "Bytespider", // ByteDance
  "Amazonbot", // Amazon
  "cohere-ai", // Cohere
  "cohere-training-data-crawler", // Cohere
  "Diffbot",
  "omgili", // Webz.io, sold as training data
  "omgilibot",
  "ImagesiftBot",
  "AI2Bot", // Allen Institute for AI
  "PanguBot", // Huawei
  "Timpibot",
];

/**
 * Where the work lives: posts, listings, profiles, the feeds that excerpt them
 * and the uploaded images. Pages about Unprompters itself (home, /about,
 * /standard, the writing check) stay open, so AI tools still know what the site is.
 */
export const CREATOR_WORK_PATHS = ["/journal", "/listing/", "/u/", "/explore", "/marketplace", "/api/files/"];
