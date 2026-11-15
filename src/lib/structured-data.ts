// Shared pieces of schema.org structured data, so search engines and AI tools
// read the same facts about Unprompters and its work everywhere.

import { siteUrl } from "@/lib/format";
import { TIER_INFO, type Tier } from "@/lib/scoring";

export const SITE_NAME = "Unprompters";
export const SITE_DESCRIPTION =
  "Explore writing, art, film, code, handicrafts and more, made by people. See how each piece was made and how much AI was involved, and buy it if it's for sale.";

/** A public address for an uploaded file. */
export function fileUrl(name: string) {
  return `${siteUrl()}/api/files/${name}`;
}

export function organization() {
  const base = siteUrl();
  return {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    url: base,
    logo: `${base}/icon.svg`,
    description: SITE_DESCRIPTION,
  };
}

export function website() {
  const base = siteUrl();
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    url: base,
    description: SITE_DESCRIPTION,
    publisher: { "@id": `${base}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/explore?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Breadcrumbs as shown on the page; paths are site-relative. */
export function breadcrumbs(items: { name: string; path: string }[]) {
  const base = siteUrl();
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}

/** The AI-involvement estimate, the fact every piece on the site carries. */
export function aiInvolvement(aiPercent: number, tier: string) {
  const info = TIER_INFO[tier as Tier];
  return [
    {
      "@type": "PropertyValue",
      name: "AI disclosure and scan score",
      value: aiPercent,
      unitText: "percent",
      description: `Uncalibrated weighted disclosure-and-scan score, not a measured share or probability, per ${siteUrl()}/standard`,
    },
    ...(info ? [{ "@type": "PropertyValue", name: "AI tier", value: info.label, description: `${info.range}: ${info.blurb}` }] : []),
  ];
}
