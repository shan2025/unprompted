import { ImageResponse } from "next/og";

// The picture link previews show on WhatsApp, Instagram, LinkedIn and X.

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };
export const SHARE_IMAGE_TYPE = "image/png";

const INK = "#111111";
const SOFT = "#5c5c5c";
const LINE = "#e5e5e5";

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round">
      <path d="M8.5 23.5c-1.6-2.2-2.5-4.8-2.5-7.5C6 10.5 10.5 6 16 6c3.3 0 6.2 1.6 8 4" />
      <path d="M11.5 25.5c-1.4-2.4-2.2-5.4-2-8.6.3-3.6 3-6.4 6.5-6.4 3.6 0 6.5 2.9 6.5 6.5 0 1.5-.2 3-.6 4.4" />
      <path d="M15 26.5c-1.5-3-2-6.2-1.6-9.4.2-1.3 1.3-2.3 2.6-2.3 1.5 0 2.6 1.2 2.6 2.7 0 3-.6 5.8-1.8 8.4" />
      <path d="M26 15.5c.2 2.3 0 4.6-.6 6.8" />
      <path d="M20.5 26c.4-.9.8-1.9 1.1-2.9" />
    </svg>
  );
}

export function shareImage({
  title,
  eyebrow,
  byline,
  aiPercent,
  tierLabel,
}: {
  title: string;
  eyebrow?: string;
  byline?: string;
  aiPercent?: number;
  tierLabel?: string;
}) {
  const shown = title.length > 90 ? `${title.slice(0, 87).trimEnd()}…` : title;
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: "#ffffff", color: INK }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark size={52} />
          <span style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase" }}>Unprompters</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && <span style={{ fontSize: 26, color: SOFT, letterSpacing: 2, textTransform: "uppercase" }}>{eyebrow}</span>}
          <span style={{ fontSize: shown.length > 45 ? 60 : 76, lineHeight: 1.1 }}>{shown}</span>
          {byline && <span style={{ fontSize: 30, color: SOFT }}>{byline}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, borderTop: `2px solid ${LINE}`, paddingTop: 28 }}>
          {aiPercent === undefined ? (
            <span style={{ fontSize: 30, color: SOFT }}>See how it was made, and how much AI was involved.</span>
          ) : (
            <>
              <span style={{ fontSize: 44 }}>{aiPercent}% AI</span>
              {tierLabel && <span style={{ fontSize: 30, color: SOFT }}>{tierLabel}</span>}
            </>
          )}
        </div>
      </div>
    ),
    SHARE_IMAGE_SIZE,
  );
}
