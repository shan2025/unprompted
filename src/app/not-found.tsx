import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotFoundMessage } from "@/components/NotFoundMessage";

// For addresses that match no route. Pages inside the site layout use
// (site)/not-found.tsx, which already sits inside the header and footer.
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <NotFoundMessage />
      </main>
      <Footer />
    </>
  );
}
