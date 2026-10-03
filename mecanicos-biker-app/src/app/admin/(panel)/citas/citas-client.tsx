"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { APPOINTMENT_STATUS_LABEL, type Appointment, type AppointmentStatus } from "@/lib/admin-data";
import { AppointmentStatusBadge } from "@/components/admin/StatusBadge";
import { updateAppointmentStatus } from "@/lib/actions/appointments";

const FILTERS: { value: AppointmentStatus | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "en_proceso", label: "En proceso" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_OPTIONS: AppointmentStatus[] = ["pendiente", "confirmada", "en_proceso", "completada", "cancelada"];

export function CitasClient({ initialAppointments }: { initialAppointments: Appointment[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [filter, setFilter] = useState<AppointmentStatus | "todas">("todas");
  const [query, setQuery] = useState("");
  const [completing, setCompleting] = useState<Appointment | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(() => {
    return appointments
      .filter((a) => filter === "todas" || a.status === filter)
      .filter((a) => a.customer.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (a.date + a.hour).localeCompare(b.date + b.hour));
  }, [appointments, filter, query]);

  function updateStatus(a: Appointment, status: AppointmentStatus) {
    if (status === "completada" && a.status !== "completada") {
      setCompleting(a);
      setAmountInput("");
      setCompleteError(null);
      return;
    }
    setStatusError(null);
    setAppointments((prev) => prev.map((x) => (x.id === a.id ? { ...x, status } : x)));
    startTransition(async () => {
      try {
        await updateAppointmentStatus(a.id, status);
      } catch {
        // Si la escritura falló, la UI ya había mostrado el estado nuevo
        // como si se hubiera guardado — hay que regresarlo para no dejar al
        // admin viendo algo que la base de datos nunca llegó a tener.
        setAppointments((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)));
        setStatusError("No se pudo actualizar el estado de la cita. Intenta de nuevo.");
      }
    });
  }

  function confirmCompletion() {
    if (!completing) return;
    const amount = Math.round(Number(amountInput));
    if (!amountInput || !Number.isFinite(amount) || amount < 0) {
      setCompleteError("Escribe el monto que se cobró (puede ser 0).");
      return;
    }
    const id = completing.id;
    setCompleteError(null);
    startTransition(async () => {
      const res = await updateAppointmentStatus(id, "completada", amount);
      if (!res.ok) {
        setCompleteError(res.error);
        return;
      }
      setAppointments((prev) => prev.map((x) => (x.id === id ? { ...x, status: "completada", amount } : x)));
      setCompleting(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {statusError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{statusError}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                filter === f.value ? "bg-[#1d1d1f] text-white" : "bg-white text-muted hover:text-[#1d1d1f]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente…"
          className="h-9 w-full rounded-full border border-black/10 bg-white px-4 text-[13.5px] outline-none focus:border-accent sm:w-56"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[840px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-black/5 text-[12px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Cliente</th>
              <th className="px-5 py-3 font-semibold">Servicio</th>
              <th className="px-5 py-3 font-semibold">Fecha</th>
              <th className="px-5 py-3 font-semibold">Hora</th>
              <th className="px-5 py-3 font-semibold">Recibido</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Importe</th>
              <th className="px-5 py-3 font-semibold">Actualizar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-surface/60">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-[#1d1d1f]">{a.customer}</p>
                  <p className="text-[12px] text-muted">{a.phone}</p>
                </td>
                <td className="px-5 py-3.5 text-[#1d1d1f]/80">{a.service}</td>
                <td className="px-5 py-3.5 text-[#1d1d1f]/80">{a.date}</td>
                <td className="px-5 py-3.5 text-[#1d1d1f]/80">{a.hour}</td>
                <td className="px-5 py-3.5">
                  {a.checkedInAt ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Sí, por QR
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <AppointmentStatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status]} />
                </td>
                <td className="px-5 py-3.5 text-[#1d1d1f]/80">
                  {a.amount != null ? `$${a.amount.toLocaleString("es-MX")}` : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <select
                    value={a.status}
                    onChange={(e) => updateStatus(a, e.target.value as AppointmentStatus)}
                    className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[12.5px] outline-none focus:border-accent"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {APPOINTMENT_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted">
                  No hay citas que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[12.5px] text-muted">
        Estas citas vienen del calendario público en tiempo real. La columna “Recibido” se marca sola cuando escaneas el
        código QR del cliente en{" "}
        <Link href="/admin/escanear" className="font-semibold text-accent hover:underline">
          Escanear
        </Link>
        .
      </p>

      <AnimatePresence>
        {completing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompleting(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 1, scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6"
            >
              <h2 className="mb-2 text-lg font-semibold text-[#1d1d1f]">Completar cita</h2>
              <p className="mb-4 text-[13px] text-muted">
                ¿Cuánto se cobró a {completing.customer} por &ldquo;{completing.service}&rdquo;? Este monto se suma a
                tus ingresos y al corte.
              </p>
              {completeError && (
                <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{completeError}</p>
              )}
              <label className="mb-5 flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                Monto cobrado (MXN)
                <input
                  autoFocus
                  type="number"
                  min="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCompleting(null)}
                  className="h-10 flex-1 rounded-full border border-black/10 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCompletion}
                  disabled={isPending}
                  className="h-10 flex-1 rounded-full bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
