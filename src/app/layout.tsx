import type { Metadata } from "next";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Unprompters: human-made work, with receipts", template: "%s · Unprompters" },
  description:
    "A marketplace for code, writing, art, ideas and more, made by people. Every listing shows how much AI was involved, and why.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
