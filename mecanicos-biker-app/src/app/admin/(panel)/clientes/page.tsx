import { listCustomers, listRewardItems } from "@/lib/db";
import { ClientesClient } from "./clientes-client";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const [customers, rewardItems] = await Promise.all([listCustomers(), listRewardItems()]);
  return <ClientesClient customers={customers} rewardItems={rewardItems} />;
}
