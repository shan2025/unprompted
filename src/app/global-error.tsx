"use client";

// The last resort: shown when the root layout itself fails, so it brings its
// own <html>, <body> and styles (the site's stylesheet isn't loaded here).
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#fff", color: "#111", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <title>Something went wrong · Unprompters</title>
        <div style={{ maxWidth: 520, padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#767676" }}>Unprompters</p>
          <h1 style={{ margin: "12px 0 0", fontSize: 40, fontWeight: 300, letterSpacing: "-0.02em" }}>This page didn&apos;t load.</h1>
          <p style={{ margin: "16px 0 0", fontSize: 18, lineHeight: 1.6, color: "#3c3c3c" }}>The problem is on our side and it has been logged. Trying again usually works.</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 40, padding: "14px 28px", border: 0, background: "#111", color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
