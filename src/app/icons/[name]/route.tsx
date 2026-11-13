import { ImageResponse } from "next/og";

// PNG app icons for the web app manifest (home-screen installs need PNGs at 192 and 512).
// "maskable" variants keep the mark inside the central safe zone so Android can crop it to any shape.

const INK = "#111111";

const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><g stroke="#ffffff" stroke-width="2" stroke-linecap="round"><path d="M8.5 23.5c-1.6-2.2-2.5-4.8-2.5-7.5C6 10.5 10.5 6 16 6c3.3 0 6.2 1.6 8 4"/><path d="M11.5 25.5c-1.4-2.4-2.2-5.4-2-8.6.3-3.6 3-6.4 6.5-6.4 3.6 0 6.5 2.9 6.5 6.5 0 1.5-.2 3-.6 4.4"/><path d="M15 26.5c-1.5-3-2-6.2-1.6-9.4.2-1.3 1.3-2.3 2.6-2.3 1.5 0 2.6 1.2 2.6 2.7 0 3-.6 5.8-1.8 8.4"/><path d="M26 15.5c.2 2.3 0 4.6-.6 6.8"/><path d="M20.5 26c.4-.9.8-1.9 1.1-2.9"/></g></svg>`;
const MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "192.png": { size: 192, maskable: false },
  "512.png": { size: 512, maskable: false },
  "maskable-192.png": { size: 192, maskable: true },
  "maskable-512.png": { size: 512, maskable: true },
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = ICONS[(await params).name];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, maskable } = icon;
  // Plain icons: rounded square like the favicon. Maskable: full-bleed ink, mark within the 80% safe zone.
  const mark = Math.round(size * (maskable ? 0.6 : 1));
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: INK,
          borderRadius: maskable ? 0 : Math.round(size * (7 / 32)),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={MARK_SRC} width={mark} height={mark} />
      </div>
    ),
    { width: size, height: size },
  );
}
