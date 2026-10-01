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

export const metadata: Metadata = {
  title: "Mecánicos Biker — Taller especializado en MTB",
  description:
    "Taller especializado en bicicletas de montaña: servicio de suspensión, frenos, transmisión y mantenimiento general. Técnicos certificados y garantía por escrito.",
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
