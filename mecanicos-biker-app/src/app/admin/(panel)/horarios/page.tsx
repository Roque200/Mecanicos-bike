import { getWeeklySchedule, listScheduleOverrides, listAppointments } from "@/lib/db";
import { HorariosClient } from "./horarios-client";

export const dynamic = "force-dynamic";

export default function AdminHorariosPage() {
  const weekly = getWeeklySchedule();
  const overrides = listScheduleOverrides();
  const appointments = listAppointments();
  return <HorariosClient initialWeekly={weekly} initialOverrides={overrides} initialAppointments={appointments} />;
}
