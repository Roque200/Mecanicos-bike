import { Products } from "@/components/Products";

// El catálogo y las piezas de segunda mano cambian en vivo desde el panel.
export const dynamic = "force-dynamic";

export default function TiendaPage() {
  return <Products />;
}
