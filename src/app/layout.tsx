import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource-variable/figtree";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ga4MeasurementId } from "@/lib/analytics";
import { ga4RunsInThisEnvironment, ga4TracksVisitor } from "@/lib/analytics-audience";
import { getCurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/format";
import { SITE_DESCRIPTION as DESCRIPTION } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Unprompters: explore work made by people", template: "%s · Unprompters" },
  description: DESCRIPTION,
  openGraph: {
    siteName: "Unprompters",
    title: "Unprompters: explore work made by people",
    description: DESCRIPTION,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  applicationName: "Unprompters",
  // iOS home-screen install: open full screen with a white status bar and a short title.
  appleWebApp: { capable: true, title: "Unprompters", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch and home indicator; the header and tab bar pad themselves with safe-area insets.
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        {children}
        <Analytics />
        {ga4MeasurementId && ga4RunsInThisEnvironment() && (
          <Suspense fallback={null}>
            <AnalyticsForVisitor measurementId={ga4MeasurementId} />
          </Suspense>
        )}
      </body>
    </html>
  );
}

async function AnalyticsForVisitor({ measurementId }: { measurementId: string }) {
  const user = await getCurrentUser();
  return <GoogleAnalytics measurementId={measurementId} enabled={ga4TracksVisitor(user)} />;
}
