"use server";

import { revalidatePath } from "next/cache";
import {
  updateWeeklySchedule as dbUpdateWeeklySchedule,
  upsertScheduleOverride as dbUpsertScheduleOverride,
  deleteScheduleOverride as dbDeleteScheduleOverride,
  InvalidScheduleError,
  type WeeklyDaySchedule,
} from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export async function updateWeeklySchedule(days: WeeklyDaySchedule[]) {
  await requireAdmin();
  try {
    await dbUpdateWeeklySchedule(days);
    revalidatePath("/admin/horarios");
    return { ok: true as const };
  } catch (err) {
    if (err instanceof InvalidScheduleError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function upsertScheduleOverride(input: {
  date: string;
  closed: boolean;
  openHour: number | null;
  closeHour: number | null;
  note: string | null;
}) {
  await requireAdmin();
  try {
    const override = await dbUpsertScheduleOverride(input);
    revalidatePath("/admin/horarios");
    return { ok: true as const, override };
  } catch (err) {
    if (err instanceof InvalidScheduleError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function deleteScheduleOverride(date: string) {
  await requireAdmin();
  await dbDeleteScheduleOverride(date);
  revalidatePath("/admin/horarios");
}
