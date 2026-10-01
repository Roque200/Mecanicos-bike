"use client";

import { useState, useTransition, type FormEvent } from "react";
import { WEEKDAYS_ES, formatHour } from "@/lib/booking";
import type { Appointment, ScheduleOverride, WeeklyDaySchedule } from "@/lib/admin-data";
import { updateWeeklySchedule, upsertScheduleOverride, deleteScheduleOverride } from "@/lib/actions/schedule";
import { CitasCalendar } from "./citas-calendar";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);
const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

const EMPTY_OVERRIDE_FORM = {
  date: "",
  closed: true,
  openHour: "9",
  closeHour: "18",
  note: "",
};

function sortDays(days: WeeklyDaySchedule[]): WeeklyDaySchedule[] {
  return DAY_ORDER.map((d) => days.find((w) => w.dayOfWeek === d)!).filter(Boolean);
}

export function HorariosClient({
  initialWeekly,
  initialOverrides,
  initialAppointments,
}: {
  initialWeekly: WeeklyDaySchedule[];
  initialOverrides: ScheduleOverride[];
  initialAppointments: Appointment[];
}) {
  const [weekly, setWeekly] = useState<WeeklyDaySchedule[]>(sortDays(initialWeekly));
  const [overrides, setOverrides] = useState<ScheduleOverride[]>(initialOverrides);
  const [overrideForm, setOverrideForm] = useState(EMPTY_OVERRIDE_FORM);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklySaved, setWeeklySaved] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateDay(dayOfWeek: number, patch: Partial<WeeklyDaySchedule>) {
    setWeeklySaved(false);
    setWeekly((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  function saveWeekly() {
    setWeeklyError(null);
    for (const day of weekly) {
      if (day.isOpen && day.openHour > day.closeHour) {
        setWeeklyError(`En ${WEEKDAYS_ES[day.dayOfWeek]}, la hora de apertura no puede ser después de la de cierre.`);
        return;
      }
    }
    startTransition(async () => {
      const res = await updateWeeklySchedule(weekly);
      if (!res.ok) {
        setWeeklyError(res.error);
        return;
      }
      setWeeklySaved(true);
    });
  }

  function handleAddOverride(e: FormEvent) {
    e.preventDefault();
    setOverrideError(null);
    if (!overrideForm.date) {
      setOverrideError("Elige una fecha.");
      return;
    }
    const input = {
      date: overrideForm.date,
      closed: overrideForm.closed,
      openHour: overrideForm.closed ? null : Number(overrideForm.openHour),
      closeHour: overrideForm.closed ? null : Number(overrideForm.closeHour),
      note: overrideForm.note.trim() || null,
    };
    startTransition(async () => {
      const res = await upsertScheduleOverride(input);
      if (!res.ok) {
        setOverrideError(res.error);
        return;
      }
      setOverrides((prev) => [...prev.filter((o) => o.date !== res.override.date), res.override].sort((a, b) => a.date.localeCompare(b.date)));
      setOverrideForm(EMPTY_OVERRIDE_FORM);
    });
  }

  function removeOverride(date: string) {
    setOverrides((prev) => prev.filter((o) => o.date !== date));
    startTransition(() => {
      deleteScheduleOverride(date);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Horario semanal</h2>
            <p className="text-[12.5px] text-muted">Define qué días abre el taller y en qué horas se pueden agendar citas.</p>
          </div>
        </div>

        {weeklyError && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{weeklyError}</p>}
        {weeklySaved && !weeklyError && (
          <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-700">Horario guardado.</p>
        )}

        <div className="flex flex-col divide-y divide-black/5">
          {weekly.map((day) => (
            <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex w-32 shrink-0 items-center gap-2 text-[13.5px] font-medium text-[#1d1d1f]">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  onChange={(e) => updateDay(day.dayOfWeek, { isOpen: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
                {WEEKDAYS_ES[day.dayOfWeek].charAt(0).toUpperCase() + WEEKDAYS_ES[day.dayOfWeek].slice(1)}
              </label>

              {day.isOpen ? (
                <div className="flex items-center gap-2 text-[13px] text-muted">
                  <span>De</span>
                  <select
                    value={day.openHour}
                    onChange={(e) => updateDay(day.dayOfWeek, { openHour: Number(e.target.value) })}
                    className="h-9 rounded-lg border border-black/10 px-2 text-[13px] outline-none focus:border-accent"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                  <span>a</span>
                  <select
                    value={day.closeHour}
                    onChange={(e) => updateDay(day.dayOfWeek, { closeHour: Number(e.target.value) })}
                    className="h-9 rounded-lg border border-black/10 px-2 text-[13px] outline-none focus:border-accent"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                  <span className="text-[12px] text-muted/70">(última hora agendable)</span>
                </div>
              ) : (
                <span className="text-[13px] text-muted">Cerrado</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveWeekly}
          disabled={isPending}
          className="mt-5 h-10 rounded-full bg-accent px-5 text-[13.5px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] disabled:opacity-60"
        >
          Guardar horario
        </button>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Excepciones por fecha</h2>
        <p className="mb-4 text-[12.5px] text-muted">
          Cierra un día específico (vacaciones, festivos) o dale un horario distinto al habitual.
        </p>

        {overrideError && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{overrideError}</p>}

        <form onSubmit={handleAddOverride} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl bg-surface/60 p-4">
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted">
            Fecha
            <input
              type="date"
              required
              value={overrideForm.date}
              onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
              className="h-9 rounded-lg border border-black/10 px-2.5 text-[13px] outline-none focus:border-accent"
            />
          </label>

          <label className="flex items-center gap-2 pb-2 text-[13px] font-medium text-[#1d1d1f]">
            <input
              type="checkbox"
              checked={overrideForm.closed}
              onChange={(e) => setOverrideForm({ ...overrideForm, closed: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Cerrar todo el día
          </label>

          {!overrideForm.closed && (
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <span>De</span>
              <select
                value={overrideForm.openHour}
                onChange={(e) => setOverrideForm({ ...overrideForm, openHour: e.target.value })}
                className="h-9 rounded-lg border border-black/10 px-2 text-[13px] outline-none focus:border-accent"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
              <span>a</span>
              <select
                value={overrideForm.closeHour}
                onChange={(e) => setOverrideForm({ ...overrideForm, closeHour: e.target.value })}
                className="h-9 rounded-lg border border-black/10 px-2 text-[13px] outline-none focus:border-accent"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="flex flex-1 min-w-[160px] flex-col gap-1.5 text-[12.5px] font-medium text-muted">
            Motivo (opcional)
            <input
              value={overrideForm.note}
              onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
              placeholder="Ej. puente, vacaciones…"
              className="h-9 rounded-lg border border-black/10 px-2.5 text-[13px] outline-none focus:border-accent"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="h-9 shrink-0 rounded-full bg-[#1d1d1f] px-4 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            Agregar excepción
          </button>
        </form>

        <div className="flex flex-col divide-y divide-black/5">
          {overrides.length === 0 && <p className="py-4 text-center text-[13px] text-muted">No hay excepciones registradas.</p>}
          {overrides.map((o) => (
            <div key={o.date} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-[13.5px] font-medium text-[#1d1d1f]">{o.date}</p>
                <p className="text-[12.5px] text-muted">
                  {o.closed ? "Cerrado todo el día" : `${formatHour(o.openHour!)} a ${formatHour(o.closeHour!)}`}
                  {o.note ? ` · ${o.note}` : ""}
                </p>
              </div>
              <button
                onClick={() => removeOverride(o.date)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                aria-label={`Eliminar excepción del ${o.date}`}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <CitasCalendar initialAppointments={initialAppointments} weekly={weekly} overrides={overrides} />
    </div>
  );
}
