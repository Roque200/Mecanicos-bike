import type { Metadata } from "next";
import { Geist, Geist_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { QuoteProvider } from "@/lib/quote-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-badge",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Dominio de producción que Vercel expone solo; sirve para que las ligas
// compartidas (WhatsApp, Facebook) armen bien la URL de la imagen de vista
// previa. En local cae a localhost.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const DESCRIPTION =
  "Taller especializado en bicicletas de montaña en Apaseo el Grande: servicio de suspensión, frenos, transmisión y mantenimiento general. Técnicos certificados y garantía por escrito.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mecánicos Bike — Taller especializado en MTB",
    template: "%s · Mecánicos Bike",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Mecánicos Bike",
    title: "Mecánicos Bike — Taller especializado en MTB",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${barlowCondensed.variable}`}
    >
      <body className="antialiased">
        <CartProvider>
          <QuoteProvider>{children}</QuoteProvider>
        </CartProvider>
      </body>
    </html>
  );
}
