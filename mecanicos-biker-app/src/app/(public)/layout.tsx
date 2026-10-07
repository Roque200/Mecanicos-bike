import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { QuoteDrawer } from "@/components/QuoteDrawer";
import { mercadoPagoEnabled } from "@/lib/mercadopago";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="fixed left-3 top-3 z-[200] -translate-y-20 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-transform focus:translate-y-0"
      >
        Saltar al contenido principal
      </a>
      <Navbar />
      <main id="main">{children}</main>
      <Footer />
      {/* Se decide aquí, en el servidor: antes el carrito lo preguntaba con una
          llamada al servidor cada vez que se abría cualquier página. */}
      <CartDrawer mpAvailable={mercadoPagoEnabled()} />
      <QuoteDrawer />
    </>
  );
}
