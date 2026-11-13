import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { TabBar, TabBarSpacer } from "@/components/TabBar";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <TabBarSpacer />
      <TabBar />
    </>
  );
}
