import { getWeeklySchedule, listScheduleOverrides, listAppointments } from "@/lib/db";
import { HorariosClient } from "./horarios-client";

export const dynamic = "force-dynamic";

export default async function AdminHorariosPage() {
  const [weekly, overrides, appointments] = await Promise.all([
    getWeeklySchedule(),
    listScheduleOverrides(),
    listAppointments(),
  ]);
  return <HorariosClient initialWeekly={weekly} initialOverrides={overrides} initialAppointments={appointments} />;
}
