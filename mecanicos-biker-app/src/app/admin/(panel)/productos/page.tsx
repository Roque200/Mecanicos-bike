import { listProducts } from "@/lib/db";
import { ProductosClient } from "./productos-client";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const products = await listProducts();
  return <ProductosClient initialProducts={products} />;
}
