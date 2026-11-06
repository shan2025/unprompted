import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/sell", "/journal/new", "/login", "/signup", "/forgot-password", "/reset-password", "/start"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
