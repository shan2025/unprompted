import { Footer } from "@/components/Footer";
import { TabBar, TabBarSpacer } from "@/components/TabBar";

// Log in and sign up keep the site's footer and phone tab bar but drop the top
// nav, so the form has the screen to itself. The page shows the logo instead.
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <main className="flex-1">{children}</main>
      <Footer />
      <TabBarSpacer />
      <TabBar />
    </>
  );
}
