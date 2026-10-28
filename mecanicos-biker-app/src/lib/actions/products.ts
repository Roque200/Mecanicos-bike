"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct as dbCreateProduct,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  getProductImagePaths,
  type Product,
  type ProductCategory,
} from "@/lib/db";
import { saveUploadedImage, deleteUploadedImage, InvalidUploadError } from "@/lib/uploads";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-photos";
import { requireAdmin } from "@/lib/require-admin";

function revalidateProductRoutes() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/tienda");
}

const CATEGORIES: ProductCategory[] = ["componentes", "accesorios", "cuidado", "herramientas"];

type ProductFields = Omit<Product, "id" | "imagePaths">;

// Un archivo "use server" solo puede exportar funciones async, así que esta
// clase de error se queda sin exportar — nada fuera de este archivo la usa.
class InvalidProductError extends Error {}

function readFields(formData: FormData): ProductFields {
  return {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? "") as ProductCategory,
    description: String(formData.get("description") ?? ""),
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    lowStockThreshold: Number(formData.get("lowStockThreshold")),
  };
}

function sanitizeProductInput(input: ProductFields): ProductFields {
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

/**
 * Arma la lista final de fotos en el orden que eligió el panel. Cada entrada
 * de "photo" es "existing:<archivo>" (una foto que el producto ya tenía) o
 * "new:<n>" (la n-ésima foto nueva de "image"). Las existentes se comparan
 * contra lo que dice la base, nunca contra lo que mande el navegador. Sube
 * las nuevas; si algo falla a medias, borra las que alcanzó a subir.
 */
async function resolvePhotos(formData: FormData, current: string[]): Promise<string[]> {
  const order = formData.getAll("photo").map(String);
  const files = formData.getAll("image").filter((f): f is File => f instanceof File && f.size > 0);
  if (order.length > MAX_PRODUCT_PHOTOS) {
    throw new InvalidProductError(`Máximo ${MAX_PRODUCT_PHOTOS} fotos por producto.`);
  }

  const saved: string[] = [];
  try {
    const result: string[] = [];
    for (const entry of order) {
      if (entry.startsWith("existing:")) {
        const path = entry.slice("existing:".length);
        if (current.includes(path) && !result.includes(path)) result.push(path);
      } else if (entry.startsWith("new:")) {
        const file = files[Number(entry.slice("new:".length))];
        if (!file) continue;
        const path = await saveUploadedImage(file);
        saved.push(path);
        result.push(path);
      }
    }
    return result;
  } catch (err) {
    await Promise.all(saved.map((path) => deleteUploadedImage(path)));
    throw err;
  }
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  try {
    const fields = sanitizeProductInput(readFields(formData));
    const imagePaths = await resolvePhotos(formData, []);
    const product = await dbCreateProduct({ ...fields, imagePaths });
    revalidateProductRoutes();
    return { ok: true as const, product };
  } catch (err) {
    if (err instanceof InvalidProductError || err instanceof InvalidUploadError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin();
  try {
    const fields = sanitizeProductInput(readFields(formData));
    const current = await getProductImagePaths(id);
    if (!current) throw new InvalidProductError("Este producto ya no existe.");
    const imagePaths = await resolvePhotos(formData, current);
    await dbUpdateProduct(id, { ...fields, imagePaths });
    // Las fotos que se quitaron se borran hasta que el producto ya no las usa.
    await Promise.all(current.filter((path) => !imagePaths.includes(path)).map((path) => deleteUploadedImage(path)));
    revalidateProductRoutes();
    return { ok: true as const, imagePaths };
  } catch (err) {
    if (err instanceof InvalidProductError || err instanceof InvalidUploadError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const deleted = await dbDeleteProduct(id);
  if (deleted) await Promise.all(deleted.imagePaths.map((path) => deleteUploadedImage(path)));
  revalidateProductRoutes();
}
