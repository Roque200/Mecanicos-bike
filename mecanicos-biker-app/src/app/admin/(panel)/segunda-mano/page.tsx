import { listSecondHandItems } from "@/lib/db";
import { SegundaManoClient } from "./segunda-mano-client";

export const dynamic = "force-dynamic";

export default async function AdminSegundaManoPage() {
  const items = await listSecondHandItems();
  return <SegundaManoClient initialItems={items} />;
}
