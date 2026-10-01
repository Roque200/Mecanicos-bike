import { listSecondHandItems } from "@/lib/db";
import { SegundaManoClient } from "./segunda-mano-client";

export const dynamic = "force-dynamic";

export default function AdminSegundaManoPage() {
  const items = listSecondHandItems();
  return <SegundaManoClient initialItems={items} />;
}
