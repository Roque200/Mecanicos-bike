"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { APPOINTMENT_STATUS_LABEL, type Appointment } from "@/lib/admin-data";
import { AppointmentStatusBadge } from "@/components/admin/StatusBadge";
import { checkInAppointment, getAppointmentByToken } from "@/lib/actions/appointments";
import { formatPhone } from "@/lib/validation";

const READER_ID = "qr-reader";

function extractToken(rawText: string) {
  try {
    const url = new URL(rawText);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("cita");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    /* not a URL — treat the raw scanned text as the token itself */
  }
  return rawText.trim();
}

export function ScanResultCard({
  appointment,
  onCheckIn,
  pending,
}: {
  appointment: Appointment;
  onCheckIn: () => void;
  pending: boolean;
}) {
  const cancelled = appointment.status === "cancelada";
  return (
    <div className={`rounded-2xl border p-6 ${cancelled ? "border-red-200 bg-red-50" : "border-black/5 bg-white"}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">{appointment.id}</span>
        <AppointmentStatusBadge status={appointment.status} label={APPOINTMENT_STATUS_LABEL[appointment.status]} />
      </div>
      <p className="text-[19px] font-semibold text-[#1d1d1f]">{appointment.customer}</p>
      <p className="mt-0.5 text-[13.5px] text-muted">{formatPhone(appointment.phone)}</p>
      <div className="mt-4 flex flex-col gap-1.5 text-[14px] text-[#1d1d1f]/80">
        <p>
          <span className="text-muted">Servicio:</span> {appointment.service}
        </p>
        <p>
          <span className="text-muted">Fecha:</span> {appointment.date} · {appointment.hour}
        </p>
      </div>

      {cancelled ? (
        <p className="mt-5 text-[13.5px] font-medium text-red-600">Esta cita fue cancelada — no debería presentarse hoy.</p>
      ) : appointment.checkedInAt ? (
        <p className="mt-5 flex items-center gap-2 text-[13.5px] font-medium text-emerald-700">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ya se registró la llegada.
        </p>
      ) : (
        <button
          onClick={onCheckIn}
          disabled={pending}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-accent text-[14.5px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? "Registrando…" : "Marcar como recibido"}
        </button>
      )}
    </div>
  );
}

export default function AdminEscanearPage() {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [isPending, startTransition] = useTransition();
  const scannerRef = useRef<import("html5-qrcode").Html5QrcodeScanner | null>(null);
  // El lector de QR sigue llamando a lookup() en segundo plano aunque el
  // admin ya haya navegado a otra pantalla del panel — sin esto, la
  // respuesta que llega tarde actualiza el estado de un componente que ya
  // no está montado.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function lookup(rawText: string) {
    const token = extractToken(rawText);
    setError(null);
    const found = await getAppointmentByToken(token);
    if (!isMountedRef.current) return;
    if (!found) {
      setError("No encontramos ninguna cita con ese código.");
      setAppointment(null);
      return;
    }
    setAppointment(found);
  }

  useEffect(() => {
    let cancelled = false;
    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled) return;
      const scanner = new Html5QrcodeScanner(
        READER_ID,
        { fps: 10, qrbox: { width: 240, height: 240 }, rememberLastUsedCamera: true },
        false,
      );
      scanner.render(
        (decodedText) => {
          lookup(decodedText);
        },
        () => {
          /* ignore per-frame "no QR found" noise */
        },
      );
      scannerRef.current = scanner;
    });
    return () => {
      cancelled = true;
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);

  function handleCheckIn() {
    if (!appointment) return;
    startTransition(async () => {
      const updated = await checkInAppointment(appointment.qrToken);
      if (!isMountedRef.current) return;
      if (updated) setAppointment(updated);
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    lookup(manualToken.trim());
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="rounded-2xl border border-black/5 bg-white p-4">
        <div id={READER_ID} />
      </div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          placeholder="O pega/escribe el código de la cita"
          className="h-10 flex-1 rounded-xl border border-black/10 bg-white px-3.5 text-[13.5px] outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="h-10 rounded-xl border border-black/10 px-4 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
        >
          Buscar
        </button>
      </form>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600"
          >
            {error}
          </motion.p>
        )}
        {appointment && (
          <motion.div key={appointment.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ScanResultCard appointment={appointment} onCheckIn={handleCheckIn} pending={isPending} />
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[12.5px] text-muted">
        Apunta la cámara al código QR que el cliente recibió al agendar su cita. Si el celular no tiene cámara
        disponible o el navegador no da permiso, puedes escribir el código manualmente arriba.
      </p>
    </div>
  );
}
