import type { MetadataRoute } from "next";
import { AI_TRAINING_CRAWLERS, CREATOR_WORK_PATHS } from "@/lib/ai-crawlers";
import { siteUrl } from "@/lib/format";

// Pages with nothing for a search engine: account, posting and log-in pages.
const PRIVATE = ["/admin", "/dashboard", "/sell", "/journal/new", "/login", "/signup", "/forgot-password", "/reset-password", "/start", "/chat", "/email-confirmed"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // A crawler follows only the group that names it, so the private pages are repeated here.
      { userAgent: AI_TRAINING_CRAWLERS, disallow: [...CREATOR_WORK_PATHS, ...PRIVATE] },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
