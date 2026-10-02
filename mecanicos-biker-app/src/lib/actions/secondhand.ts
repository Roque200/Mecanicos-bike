"use server";

import { revalidatePath } from "next/cache";
import {
  createSecondHandItem as dbCreateSecondHandItem,
  updateSecondHandItem as dbUpdateSecondHandItem,
  updateSecondHandStatus as dbUpdateSecondHandStatus,
  deleteSecondHandItem as dbDeleteSecondHandItem,
  InvalidSecondHandItemError,
  type SecondHandStatus,
} from "@/lib/db";
import { saveUploadedImage, deleteUploadedImage, InvalidUploadError } from "@/lib/uploads";
import { requireAdmin } from "@/lib/require-admin";

function readFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: Number(formData.get("price")),
    condition: String(formData.get("condition") ?? ""),
  };
}

function revalidate() {
  revalidatePath("/admin/segunda-mano");
  revalidatePath("/");
}

export async function createSecondHandItem(formData: FormData) {
  await requireAdmin();
  const fields = readFields(formData);
  const image = formData.get("image");
  try {
    let imagePath: string | null = null;
    if (image instanceof File && image.size > 0) {
      imagePath = await saveUploadedImage(image);
    }
    const item = await dbCreateSecondHandItem({ ...fields, imagePath });
    revalidate();
    return { ok: true as const, item };
  } catch (err) {
    if (err instanceof InvalidSecondHandItemError || err instanceof InvalidUploadError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function updateSecondHandItem(id: string, currentImagePath: string | null, formData: FormData) {
  await requireAdmin();
  const fields = readFields(formData);
  const image = formData.get("image");
  try {
    let imagePath = currentImagePath;
    if (image instanceof File && image.size > 0) {
      imagePath = await saveUploadedImage(image);
      await deleteUploadedImage(currentImagePath);
    }
    await dbUpdateSecondHandItem(id, { ...fields, imagePath });
    revalidate();
    return { ok: true as const, imagePath };
  } catch (err) {
    if (err instanceof InvalidSecondHandItemError || err instanceof InvalidUploadError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function setSecondHandStatus(id: string, status: SecondHandStatus) {
  await requireAdmin();
  await dbUpdateSecondHandStatus(id, status);
  revalidate();
}

export async function deleteSecondHandItem(id: string) {
  await requireAdmin();
  const deleted = await dbDeleteSecondHandItem(id);
  if (deleted) await deleteUploadedImage(deleted.imagePath);
  revalidate();
}
