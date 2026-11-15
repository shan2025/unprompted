import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Suspense } from "react";
import { TabBar, TabBarSpacer } from "@/components/TabBar";
import { VerifyEmailBanner } from "@/components/VerifyEmailNotice";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <VerifyEmailBanner />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
      <TabBarSpacer />
      <TabBar />
    </>
  );
}
