import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getAppointmentByToken } from "@/lib/db";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/admin-data";
import { LogoMark } from "@/components/Logo";

export default async function CitaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getAppointmentByToken(token);
  if (!appointment) notFound();

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  const qrDataUrl = await QRCode.toDataURL(`${proto}://${host}/cita/${token}`, { margin: 1, width: 320 });

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 text-center">
        <div className="mb-5 flex justify-center">
          <LogoMark className="h-10 w-10" tone="black" />
        </div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">Tu cita</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1d1d1f]">{appointment.customer}</h1>

        <div className="mx-auto my-6 flex w-full max-w-[220px] items-center justify-center rounded-2xl border border-black/5 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Código QR de la cita" className="h-full w-full" />
        </div>

        <div className="flex flex-col gap-1.5 text-[14.5px] text-[#1d1d1f]/80">
          <p>
            <span className="text-muted">Servicio:</span> {appointment.service}
          </p>
          <p>
            <span className="text-muted">Fecha:</span> {appointment.date} · {appointment.hour} hrs
          </p>
          <p>
            <span className="text-muted">Estado:</span> {APPOINTMENT_STATUS_LABEL[appointment.status]}
          </p>
        </div>

        <p className="mt-6 text-[12.5px] text-muted">
          Muestra este código QR al llegar al taller — lo escaneamos para registrar tu llegada al instante.
        </p>
      </div>
    </main>
  );
}
