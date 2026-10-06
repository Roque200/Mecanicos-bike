"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import {
  createAppointment as dbCreateAppointment,
  getAppointmentByToken as dbGetAppointmentByToken,
  getBusyHoursInRange,
  getWeeklySchedule,
  listScheduleOverridesInRange,
  checkInAppointment as dbCheckInAppointment,
  updateAppointmentStatus as dbUpdateAppointmentStatus,
  rescheduleAppointment as dbRescheduleAppointment,
  SlotTakenError,
  InvalidAppointmentError,
  AmountRequiredError,
  type AppointmentStatus,
} from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { allowAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit";
import { addDays } from "@/lib/booking";

async function siteUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export async function getMonthAvailability(from: string, to: string) {
  // El calendario pide un mes a la vez; sin este tope cualquiera podía pedir
  // de golpe todas las citas de la base (año 0000 al 9999).
  if (!DATE_KEY.test(from) || !DATE_KEY.test(to) || from > to || addDays(from, 62) < to) {
    return { busy: {}, weekly: await getWeeklySchedule(), overrides: [] };
  }
  const [busy, weekly, overrides] = await Promise.all([
    getBusyHoursInRange(from, to),
    getWeeklySchedule(),
    listScheduleOverridesInRange(from, to),
  ]);
  return { busy, weekly, overrides };
}

export async function bookAppointment(input: {
  customer: string;
  phone: string;
  service: string;
  date: string;
  hour: string;
}) {
  if (!(await allowAction("booking"))) {
    return { ok: false as const, error: RATE_LIMIT_ERROR };
  }
  try {
    const appointment = await dbCreateAppointment(input);
    const base = await siteUrl();
    const url = `${base}/cita/${appointment.qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });
    revalidatePath("/admin/citas");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clientes");
    return { ok: true as const, id: appointment.id, url, qrDataUrl };
  } catch (err) {
    if (err instanceof SlotTakenError || err instanceof InvalidAppointmentError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function getAppointmentByToken(token: string) {
  return dbGetAppointmentByToken(token);
}

export async function checkInAppointment(token: string) {
  await requireAdmin();
  const appointment = await dbCheckInAppointment(token);
  revalidatePath("/admin/citas");
  revalidatePath("/admin/dashboard");
  return appointment;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, amount?: number) {
  await requireAdmin();
  try {
    await dbUpdateAppointmentStatus(id, status, amount);
    revalidatePath("/admin/citas");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clientes");
    return { ok: true as const };
  } catch (err) {
    if (err instanceof AmountRequiredError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}

export async function rescheduleAppointment(id: string, date: string, hour: string) {
  await requireAdmin();
  try {
    const appointment = await dbRescheduleAppointment(id, date, hour);
    revalidatePath("/admin/citas");
    revalidatePath("/admin/horarios");
    revalidatePath("/admin/dashboard");
    return { ok: true as const, appointment };
  } catch (err) {
    if (err instanceof SlotTakenError || err instanceof InvalidAppointmentError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
}
