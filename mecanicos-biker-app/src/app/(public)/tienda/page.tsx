import type { Metadata } from "next";
import { Products } from "@/components/Products";

// La tienda se sirve ya generada desde la caché de Vercel (sin tocar la base
// en cada visita) y se regenera sola cada minuto, así el stock que bajan los
// pedidos se refleja pronto. Los cambios del panel (productos, segunda mano,
// estado de pedidos) la regeneran al instante con revalidatePath("/tienda").
// Al pedir, el stock se vuelve a comprobar en el servidor.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tienda",
  description: "Refacciones, accesorios y piezas de segunda mano para bicicleta de montaña. Pide por WhatsApp o paga en línea.",
  openGraph: { title: "Tienda · Mecánicos Bike", description: "Refacciones, accesorios y piezas de segunda mano para bicicleta de montaña. Pide por WhatsApp o paga en línea." },
};

export default function TiendaPage() {
  return <Products />;
}
