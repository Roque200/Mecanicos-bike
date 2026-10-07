"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct as dbCreateProduct,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  type Product,
  type ProductCategory,
} from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

function revalidateProductRoutes() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/tienda");
}

const CATEGORIES: ProductCategory[] = ["componentes", "accesorios", "cuidado", "herramientas"];

// Un archivo "use server" solo puede exportar funciones async, así que esta
// clase de error se queda sin exportar — nada fuera de este archivo la usa.
class InvalidProductError extends Error {}

function sanitizeProductInput(input: Omit<Product, "id">): Omit<Product, "id"> {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new InvalidProductError("El nombre es obligatorio.");
  if (!CATEGORIES.includes(input.category)) throw new InvalidProductError("Categoría inválida.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new InvalidProductError("El precio debe ser 0 o mayor.");
  if (!Number.isInteger(input.stock) || input.stock < 0) throw new InvalidProductError("El stock debe ser un entero 0 o mayor.");
  if (!Number.isInteger(input.lowStockThreshold) || input.lowStockThreshold < 0) {
    throw new InvalidProductError("La alerta de stock debe ser un entero 0 o mayor.");
  }
  return { ...input, name, description };
}

export async function createProduct(input: Omit<Product, "id">) {
  await requireAdmin();
  try {
    const product = await dbCreateProduct(sanitizeProductInput(input));
    revalidateProductRoutes();
    return { ok: true as const, product };
  } catch (err) {
    if (err instanceof InvalidProductError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function updateProduct(id: string, input: Omit<Product, "id">) {
  await requireAdmin();
  try {
    await dbUpdateProduct(id, sanitizeProductInput(input));
    revalidateProductRoutes();
    return { ok: true as const };
  } catch (err) {
    if (err instanceof InvalidProductError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await dbDeleteProduct(id);
  revalidateProductRoutes();
}
