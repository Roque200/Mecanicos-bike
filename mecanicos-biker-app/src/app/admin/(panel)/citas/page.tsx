import { listAppointments } from "@/lib/db";
import { CitasClient } from "./citas-client";

export const dynamic = "force-dynamic";

export default async function AdminCitasPage() {
  const appointments = await listAppointments();
  return <CitasClient initialAppointments={appointments} />;
}
