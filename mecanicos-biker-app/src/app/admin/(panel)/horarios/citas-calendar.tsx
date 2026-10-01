"use client";

import { useMemo, useState, useTransition } from "react";
import {
  MONTHS_ES,
  WEEKDAYS_ES,
  computeHoursForDate,
  formatHour,
  formatLongDate,
  isoDate,
} from "@/lib/booking";
import type { Appointment, ScheduleOverride, WeeklyDaySchedule } from "@/lib/admin-data";
import { APPOINTMENT_STATUS_LABEL } from "@/lib/admin-data";
import { AppointmentStatusBadge } from "@/components/admin/StatusBadge";
import { rescheduleAppointment } from "@/lib/actions/appointments";
import { waLinkTo } from "@/lib/whatsapp";

function parseIsoDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function CitasCalendar({
  initialAppointments,
  weekly,
  overrides,
}: {
  initialAppointments: Appointment[];
  weekly: WeeklyDaySchedule[];
  overrides: ScheduleOverride[];
}) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", hour: "" });
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [notifyFor, setNotifyFor] = useState<{ appointment: Appointment; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const overridesByDate = useMemo(() => {
    const map: Record<string, ScheduleOverride> = {};
    for (const o of overrides) map[o.date] = o;
    return map;
  }, [overrides]);

  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      if (a.status === "cancelada") continue;
      map[a.date] = (map[a.date] ?? 0) + 1;
    }
    return map;
  }, [appointments]);

  const days = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    return cells;
  }, [viewMonth]);

  const selectedKey = selectedDate ? isoDate(selectedDate) : null;
  const dayAppointments = useMemo(
    () => (selectedKey ? appointments.filter((a) => a.date === selectedKey).sort((a, b) => a.hour.localeCompare(b.hour)) : []),
    [appointments, selectedKey],
  );

  function startEdit(appt: Appointment) {
    setEditingId(appt.id);
    setForm({ date: appt.date, hour: appt.hour });
    setRescheduleError(null);
    setNotifyFor(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setRescheduleError(null);
  }

  function hourOptionsFor(dateStr: string, excludeId: string) {
    if (!dateStr) return [];
    const date = parseIsoDate(dateStr);
    const hours = computeHoursForDate(date, weekly, overridesByDate);
    const busy = new Set(
      appointments.filter((a) => a.date === dateStr && a.id !== excludeId && a.status !== "cancelada").map((a) => a.hour),
    );
    return hours.map(formatHour).filter((h) => !busy.has(h));
  }

  function saveReschedule(original: Appointment) {
    setRescheduleError(null);
    startTransition(async () => {
      const res = await rescheduleAppointment(original.id, form.date, form.hour);
      if (!res.ok) {
        setRescheduleError(res.error);
        return;
      }
      setAppointments((prev) => prev.map((a) => (a.id === original.id ? res.appointment : a)));
      setEditingId(null);
      if (original.date !== res.appointment.date || original.hour !== res.appointment.hour) {
        const nuevaFecha = formatLongDate(parseIsoDate(res.appointment.date));
        setNotifyFor({
          appointment: res.appointment,
          message: `Hola ${res.appointment.customer}, tu cita en Mecánicos Biker se movió: ahora es el ${nuevaFecha} a las ${res.appointment.hour} hrs. Cualquier duda, contáctanos por aquí.`,
        });
      }
    });
  }

  function sendNotification() {
    if (!notifyFor) return;
    window.open(waLinkTo(notifyFor.appointment.phone, notifyFor.message), "_blank", "noopener");
    setNotifyFor(null);
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Calendario de citas</h2>
        <p className="text-[12.5px] text-muted">
          Da clic en un día para ver sus citas y reagendarlas. Si cambias la fecha u hora, te ofrecemos avisarle al
          cliente por WhatsApp.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] ring-1 ring-black/10 hover:ring-accent"
          aria-label="Mes anterior"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[14px] font-semibold uppercase tracking-wide text-[#1d1d1f]">
          {MONTHS_ES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] ring-1 ring-black/10 hover:ring-accent"
          aria-label="Mes siguiente"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted">
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <span key={i} />;
          const key = isoDate(date);
          const closed = computeHoursForDate(date, weekly, overridesByDate).length === 0;
          const count = countsByDate[key] ?? 0;
          const isSelected = selectedKey === key;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-[13px] transition-colors ${
                isSelected
                  ? "bg-accent font-bold text-white"
                  : closed
                    ? "text-muted/50"
                    : "text-[#1d1d1f] hover:ring-1 hover:ring-accent"
              }`}
            >
              {date.getDate()}
              {count > 0 && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-accent"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 border-t border-black/5 pt-5">
          <p className="mb-3 text-[13.5px] font-semibold text-[#1d1d1f]">
            {WEEKDAYS_ES[selectedDate.getDay()].charAt(0).toUpperCase() + WEEKDAYS_ES[selectedDate.getDay()].slice(1)}{" "}
            {selectedDate.getDate()} de {MONTHS_ES[selectedDate.getMonth()]}
          </p>

          {dayAppointments.length === 0 && <p className="text-[13px] text-muted">No hay citas este día.</p>}

          <div className="flex flex-col gap-3">
            {dayAppointments.map((appt) => (
              <div key={appt.id} data-testid={`appt-row-${appt.id}`} className="rounded-xl border border-black/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[13.5px] font-medium text-[#1d1d1f]">
                      {appt.hour} · {appt.customer}
                    </p>
                    <p className="text-[12.5px] text-muted">{appt.service}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AppointmentStatusBadge status={appt.status} label={APPOINTMENT_STATUS_LABEL[appt.status]} />
                    {editingId !== appt.id && (
                      <button
                        onClick={() => startEdit(appt)}
                        className="h-8 rounded-full border border-black/10 px-3 text-[12.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                      >
                        Reagendar
                      </button>
                    )}
                  </div>
                </div>

                {editingId === appt.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-surface/60 p-3">
                    {rescheduleError && <p className="w-full text-[12.5px] font-medium text-red-600">{rescheduleError}</p>}
                    <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
                      Nueva fecha
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ date: e.target.value, hour: "" })}
                        className="h-9 rounded-lg border border-black/10 px-2.5 text-[13px] outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
                      Nueva hora
                      <select
                        value={form.hour}
                        onChange={(e) => setForm({ ...form, hour: e.target.value })}
                        className="h-9 rounded-lg border border-black/10 px-2.5 text-[13px] outline-none focus:border-accent"
                      >
                        <option value="">Selecciona…</option>
                        {hourOptionsFor(form.date, appt.id).map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={() => saveReschedule(appt)}
                      disabled={isPending || !form.date || !form.hour}
                      className="h-9 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="h-9 rounded-full border border-black/10 px-4 text-[12.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {notifyFor && (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-2 text-[13.5px] font-semibold text-[#1d1d1f]">
            La cita de {notifyFor.appointment.customer} cambió. ¿Le avisamos por WhatsApp?
          </p>
          <textarea
            rows={3}
            value={notifyFor.message}
            onChange={(e) => setNotifyFor({ ...notifyFor, message: e.target.value })}
            className="mb-3 w-full resize-none rounded-lg border border-black/10 px-3 py-2 text-[13.5px] text-[#1d1d1f] outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={sendNotification}
              className="h-9 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white hover:bg-accent-dark"
            >
              Enviar por WhatsApp
            </button>
            <button
              onClick={() => setNotifyFor(null)}
              className="h-9 rounded-full border border-black/10 px-4 text-[12.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
            >
              No notificar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
