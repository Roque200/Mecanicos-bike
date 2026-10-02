"use server";

import { revalidatePath } from "next/cache";
import {
  createRewardItem as dbCreateRewardItem,
  updateRewardItem as dbUpdateRewardItem,
  deleteRewardItem as dbDeleteRewardItem,
  redeemReward as dbRedeemReward,
  NotEnoughPointsError,
  RewardItemNotFoundError,
} from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

// Un archivo "use server" solo puede exportar funciones async, así que esta
// clase de error se queda sin exportar — nada fuera de este archivo la usa.
class InvalidRewardItemError extends Error {}

function sanitizeRewardInput(input: { name: string; pointsCost: number }) {
  const name = input.name.trim();
  if (!name) throw new InvalidRewardItemError("El nombre del premio es obligatorio.");
  if (!Number.isInteger(input.pointsCost) || input.pointsCost <= 0) {
    throw new InvalidRewardItemError("El costo en puntos debe ser un entero mayor a 0.");
  }
  return { ...input, name };
}

export async function createRewardItem(input: { name: string; pointsCost: number }) {
  await requireAdmin();
  const item = await dbCreateRewardItem(sanitizeRewardInput(input));
  revalidatePath("/admin/clientes");
  return item;
}

export async function updateRewardItem(id: string, input: { name: string; pointsCost: number; active: boolean }) {
  await requireAdmin();
  await dbUpdateRewardItem(id, { ...sanitizeRewardInput(input), active: input.active });
  revalidatePath("/admin/clientes");
}

export async function deleteRewardItem(id: string) {
  await requireAdmin();
  await dbDeleteRewardItem(id);
  revalidatePath("/admin/clientes");
}

export async function redeemReward(customerId: string, rewardItemId: string) {
  await requireAdmin();
  try {
    const customer = await dbRedeemReward(customerId, rewardItemId);
    revalidatePath("/admin/clientes");
    return { ok: true as const, customer };
  } catch (err) {
    if (err instanceof NotEnoughPointsError || err instanceof RewardItemNotFoundError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}
