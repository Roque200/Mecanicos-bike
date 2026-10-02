import { listProducts, listOrders } from "@/lib/db";
import { VentasClient } from "./ventas-client";

export const dynamic = "force-dynamic";

export default async function AdminVentasPage() {
  const [products, orders] = await Promise.all([listProducts(), listOrders()]);
  const recentSales = orders.filter((o) => o.paymentMethod === "mostrador").slice(0, 20);
  return <VentasClient products={products} initialSales={recentSales} />;
}
