import { getListing } from "@/lib/data";
import { TIER_INFO, type Tier } from "@/lib/scoring";

const TIER_COLORS: Record<Tier, string> = {
  "human-made": "#2e6b3b",
  "human-led": "#23657a",
  "ai-assisted": "#94600a",
  "ai-heavy": "#a3271b",
};

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Roughly 6.5px per character at 11px Verdana, which is what shields-style badges use.
const textWidth = (s: string) => Math.round(s.length * 6.5) + 16;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getListing(slug);
  if (!row || (row.listing.status !== "published" && row.listing.status !== "sold")) {
    return new Response("Not found", { status: 404 });
  }

  const tier = row.listing.tier as Tier;
  const left = "Unprompted";
  const right = `${row.listing.aiPercent}% AI · ${TIER_INFO[tier]?.label ?? tier}`;
  const lw = textWidth(left);
  const rw = textWidth(right);
  const w = lw + rw;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${escape(`${left}: ${right}`)}">
<title>${escape(`${left}: ${right}`)}</title>
<clipPath id="r"><rect width="${w}" height="20" rx="4"/></clipPath>
<g clip-path="url(#r)">
<rect width="${lw}" height="20" fill="#1f1b16"/>
<rect x="${lw}" width="${rw}" height="20" fill="${TIER_COLORS[tier] ?? "#555"}"/>
</g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle">
<text x="${lw / 2}" y="14" fill="#f4efe6">${escape(left)}</text>
<text x="${lw + rw / 2}" y="14">${escape(right)}</text>
</g>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
