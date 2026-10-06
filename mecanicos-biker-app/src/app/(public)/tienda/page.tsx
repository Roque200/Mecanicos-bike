import type { Metadata } from "next";
import { Products } from "@/components/Products";

// El catálogo y las piezas de segunda mano cambian en vivo desde el panel.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Refacciones, accesorios y piezas de segunda mano para bicicleta de montaña. Pide por WhatsApp o paga en línea.",
  openGraph: { title: "Tienda · Mecánicos Bike", description: "Refacciones, accesorios y piezas de segunda mano para bicicleta de montaña. Pide por WhatsApp o paga en línea." },
};

export default function TiendaPage() {
  return <Products />;
}
