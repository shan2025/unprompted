import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import "@fontsource-variable/figtree";
import "./globals.css";
import { siteUrl } from "@/lib/format";

const DESCRIPTION =
  "Explore writing, art, film, code, handicrafts and more, made by people. See how each piece was made and how much AI was involved, and buy it if it's for sale.";

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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
