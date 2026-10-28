"use server";

import { revalidatePath } from "next/cache";
import {
  createProduct as dbCreateProduct,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  type Product,
  type ProductCategory,
} from "@/lib/db";
import { saveUploadedImage, deleteUploadedImage, InvalidUploadError } from "@/lib/uploads";
import { requireAdmin } from "@/lib/require-admin";

function revalidateProductRoutes() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/tienda");
}

const CATEGORIES: ProductCategory[] = ["componentes", "accesorios", "cuidado", "herramientas"];

type ProductFields = Omit<Product, "id" | "imagePath">;

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

function uploadedFile(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File && image.size > 0 ? image : null;
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  try {
    const fields = sanitizeProductInput(readFields(formData));
    const image = uploadedFile(formData);
    const imagePath = image ? await saveUploadedImage(image) : null;
    const product = await dbCreateProduct({ ...fields, imagePath });
    revalidateProductRoutes();
    return { ok: true as const, product };
  } catch (err) {
    if (err instanceof InvalidProductError || err instanceof InvalidUploadError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

/**
 * Guarda los cambios del producto. Con una foto nueva, reemplaza la anterior;
 * con "removeImage", la quita; sin ninguna de las dos, conserva la actual.
 */
export async function updateProduct(id: string, currentImagePath: string | null, formData: FormData) {
  await requireAdmin();
  try {
    const fields = sanitizeProductInput(readFields(formData));
    const image = uploadedFile(formData);
    let imagePath = currentImagePath;
    if (image) {
      imagePath = await saveUploadedImage(image);
    } else if (formData.get("removeImage") === "1") {
      imagePath = null;
    }
    await dbUpdateProduct(id, { ...fields, imagePath });
    // La foto anterior se borra hasta que el producto ya apunta a la nueva.
    if (imagePath !== currentImagePath) await deleteUploadedImage(currentImagePath);
    revalidateProductRoutes();
    return { ok: true as const, imagePath };
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
  if (deleted) await deleteUploadedImage(deleted.imagePath);
  revalidateProductRoutes();
}
