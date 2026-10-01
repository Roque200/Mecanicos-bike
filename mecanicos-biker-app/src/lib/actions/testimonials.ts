"use server";

import { revalidatePath } from "next/cache";
import {
  createTestimonial as dbCreateTestimonial,
  updateTestimonialStatus as dbUpdateTestimonialStatus,
  deleteTestimonial as dbDeleteTestimonial,
  InvalidTestimonialError,
  type TestimonialStatus,
} from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function submitTestimonial(input: { name: string; role: string; quote: string; stars: number }) {
  try {
    dbCreateTestimonial({ name: input.name, role: input.role, quote: input.quote, stars: input.stars });
    revalidatePath("/admin/testimonios");
    return { ok: true as const };
  } catch (err) {
    if (err instanceof InvalidTestimonialError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function setTestimonialStatus(id: string, status: TestimonialStatus) {
  await requireAdmin();
  dbUpdateTestimonialStatus(id, status);
  revalidatePath("/admin/testimonios");
  revalidatePath("/");
}

export async function deleteTestimonial(id: string) {
  await requireAdmin();
  dbDeleteTestimonial(id);
  revalidatePath("/admin/testimonios");
  revalidatePath("/");
}
