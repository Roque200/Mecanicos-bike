import { listOrders } from "@/lib/db";
import { PedidosClient } from "./pedidos-client";

export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const orders = await listOrders();
  return <PedidosClient initialOrders={orders} />;
}
