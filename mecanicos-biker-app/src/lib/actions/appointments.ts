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

async function siteUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getMonthAvailability(from: string, to: string) {
  const busy = getBusyHoursInRange(from, to);
  const weekly = getWeeklySchedule();
  const overrides = listScheduleOverridesInRange(from, to);
  return { busy, weekly, overrides };
}

export async function bookAppointment(input: {
  customer: string;
  phone: string;
  service: string;
  date: string;
  hour: string;
}) {
  try {
    const appointment = dbCreateAppointment(input);
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
  const appointment = dbCheckInAppointment(token);
  revalidatePath("/admin/citas");
  revalidatePath("/admin/dashboard");
  return appointment;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, amount?: number) {
  await requireAdmin();
  try {
    dbUpdateAppointmentStatus(id, status, amount);
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
    const appointment = dbRescheduleAppointment(id, date, hour);
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
