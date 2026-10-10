"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  MONTHS_ES,
  WEEKDAYS_ES,
  computeHoursForDate,
  formatHour,
  formatLongDate,
  formatSelectionSummary,
  isoDate,
  businessNow,
  dateFromKey,
  type ScheduleOverride,
  type WeeklyDaySchedule,
} from "@/lib/booking";
import { waLink } from "@/lib/whatsapp";
import { getMonthAvailability, bookAppointment } from "@/lib/actions/appointments";
import { SERVICE_OPTIONS, OTHER_SERVICE_VALUE, SELECT_SERVICE_EVENT } from "@/lib/services";
import { MAX_LENGTH, PHONE_ERROR, formatPhone, formatPhoneInput, normalizePhone } from "@/lib/validation";
import { Reveal } from "./Reveal";

type BookingResult = { id: string; url: string; qrDataUrl: string; whatsappUrl: string };

// Horario de respaldo mientras se resuelve la primera consulta al servidor —
// el administrador puede cambiarlo en cualquier momento desde el panel.
const FALLBACK_WEEKLY_SCHEDULE: WeeklyDaySchedule[] = [
  { dayOfWeek: 0, isOpen: false, openHour: 9, closeHour: 14 },
  { dayOfWeek: 1, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 2, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 3, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 4, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 5, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 6, isOpen: true, openHour: 9, closeHour: 14 },
];

export function Booking() {
  // "Hoy" se fija hasta que la página ya está en el navegador. /paquetes es
  // una página estática (se genera al desplegar): si se calculara durante el
  // render, el HTML traería el "hoy" y la hora del despliegue, y React no
  // corrige atributos como `disabled` al hidratar — el calendario mostraba
  // días u horas que ya pasaron como disponibles.
  const [today, setToday] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState<Date | null>(null);
  useEffect(() => {
    const now = dateFromKey(businessNow().dateKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(now);
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);
  const minMonth = useMemo(() => (today ? new Date(today.getFullYear(), today.getMonth(), 1) : null), [today]);
  const maxMonth = useMemo(() => (today ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : null), [today]);
  const todayTime = today?.getTime() ?? 0;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [busyByDate, setBusyByDate] = useState<Record<string, string[]>>({});
  const [weekly, setWeekly] = useState<WeeklyDaySchedule[]>(FALLBACK_WEEKLY_SCHEDULE);
  const [overrides, setOverrides] = useState<Record<string, ScheduleOverride>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [servicio, setServicio] = useState<string>(SERVICE_OPTIONS[0].name);
  const [servicioOtro, setServicioOtro] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // "Elegir …" en un paquete deja ese servicio seleccionado en el formulario.
  useEffect(() => {
    function onSelectService(e: Event) {
      const name = (e as CustomEvent<string>).detail;
      if (SERVICE_OPTIONS.some((s) => s.name === name)) setServicio(name);
    }
    window.addEventListener(SELECT_SERVICE_EVENT, onSelectService);
    return () => window.removeEventListener(SELECT_SERVICE_EVENT, onSelectService);
  }, []);
  // Si el usuario se impacienta con lo lento de la respuesta y navega a otra
  // pantalla antes de que bookAppointment() termine, este componente ya no
  // existe cuando la promesa resuelve — actualizar su estado en ese momento
  // (o abrir la ventana de WhatsApp) es lo que tronaba en React y dejaba el
  // formulario a medias, sin mostrar el QR ni limpiarse.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const days = useMemo(() => {
    if (!viewMonth) return [];
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    }
    return cells;
  }, [viewMonth]);

  const refreshAvailability = useCallback(() => {
    if (!viewMonth) return Promise.resolve();
    const from = isoDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
    const to = isoDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));
    return getMonthAvailability(from, to).then(({ busy, weekly, overrides }) => {
      setBusyByDate(busy);
      setWeekly(weekly);
      const overridesByDate: Record<string, ScheduleOverride> = {};
      for (const o of overrides) overridesByDate[o.date] = o;
      setOverrides(overridesByDate);
    });
  }, [viewMonth]);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  function hoursFor(date: Date) {
    return computeHoursForDate(date, weekly, overrides);
  }

  const slots = selectedDate ? hoursFor(selectedDate) : [];
  const isSelectedToday = selectedDate?.getTime() === todayTime;
  const nowHour = today ? businessNow().hour : 0;
  const busyForSelected = selectedDate ? (busyByDate[isoDate(selectedDate)] ?? []) : [];

  function dayHasFreeSlot(date: Date) {
    const hours = hoursFor(date);
    if (hours.length === 0) return false;
    const isToday = date.getTime() === todayTime;
    const busy = busyByDate[isoDate(date)] ?? [];
    return hours.some((h) => {
      if (isToday && h <= nowHour) return false;
      return !busy.includes(formatHour(h));
    });
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setSelectedHour(null);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedDate || selectedHour === null || !formRef.current) return;

    const form = formRef.current;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const nombre = (form.elements.namedItem("nombre") as HTMLInputElement).value.trim();
    const telefono = (form.elements.namedItem("telefono") as HTMLInputElement).value.trim();
    const servicioFinal = servicio === OTHER_SERVICE_VALUE ? servicioOtro.trim() : servicio;
    if (!servicioFinal) return;
    if (!normalizePhone(telefono)) {
      setSubmitError(PHONE_ERROR);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const res = await bookAppointment({
      customer: nombre,
      phone: telefono,
      service: servicioFinal,
      date: isoDate(selectedDate),
      hour: formatHour(selectedHour),
    });
    if (!isMountedRef.current) return;
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(res.error);
      refreshAvailability();
      setSelectedHour(null);
      return;
    }
    refreshAvailability();

    const message =
      "Hola, agendé una cita:\n" +
      `- Nombre: ${nombre}\n` +
      `- Teléfono: ${formatPhone(telefono)}\n` +
      `- Servicio: ${servicioFinal}\n` +
      `- Fecha: ${formatLongDate(selectedDate)}\n` +
      `- Hora: ${formatHour(selectedHour)} hrs\n` +
      `- Folio: ${res.id}\n` +
      `- Ver mi cita: ${res.url}`;
    // WhatsApp no se abre solo: primero el cliente ve y guarda su QR, y
    // abre WhatsApp con el botón cuando quiera. Al ser un toque directo, el
    // navegador nunca lo bloquea y no quedan pestañas de más.
    setResult({ id: res.id, url: res.url, qrDataUrl: res.qrDataUrl, whatsappUrl: waLink(message) });
  }

  function bookAnother() {
    setResult(null);
    setSelectedDate(null);
    setSelectedHour(null);
    setServicio(SERVICE_OPTIONS[0].name);
    setServicioOtro("");
    formRef.current?.reset();
  }

  const canGoPrev = Boolean(viewMonth && minMonth && viewMonth.getTime() > minMonth.getTime());
  const canGoNext = Boolean(viewMonth && maxMonth && viewMonth.getTime() < maxMonth.getTime());

  return (
    <section id="contacto" className="bg-[#1d1d1f] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
            Agenda tu cita
          </p>
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            El servicio de tu bici, cuando a ti te convenga
          </h2>
          <p className="mt-4 text-lg text-white/60">
            Elige un día y horario disponible, cuéntanos qué necesita tu bici y confirmamos por WhatsApp.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal className="rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => viewMonth && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white ring-1 ring-white/10 transition-colors enabled:hover:ring-accent disabled:opacity-30"
                aria-label="Mes anterior"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-[15px] font-semibold uppercase tracking-wide text-white">
                {viewMonth ? `${MONTHS_ES[viewMonth.getMonth()]} ${viewMonth.getFullYear()}` : "\u00a0"}
              </span>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => viewMonth && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white ring-1 ring-white/10 transition-colors enabled:hover:ring-accent disabled:opacity-30"
                aria-label="Mes siguiente"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-white/40">
              {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Esqueleto del mismo tamaño mientras se fija "hoy" en el navegador. */}
              {days.length === 0 &&
                Array.from({ length: 35 }, (_, i) => (
                  <span key={`placeholder-${i}`} className="aspect-square rounded-lg bg-white/[0.03]" />
                ))}
              {days.map((date, i) => {
                if (!date) return <span key={i} />;
                const closed = hoursFor(date).length === 0;
                const past = date.getTime() < todayTime;
                const hasFree = !closed && !past && dayHasFreeSlot(date);
                const isToday = date.getTime() === todayTime;
                const isSelected = selectedDate?.getTime() === date.getTime();
                const soldOut = !closed && !past && !hasFree;
                const disabled = past || closed || soldOut;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDate(date)}
                    className={`relative aspect-square rounded-lg text-[13px] transition-colors ${
                      isSelected
                        ? "bg-accent font-bold text-white"
                        : soldOut
                          ? "text-danger/80 line-through"
                          : disabled
                            ? "text-white/25"
                            : "text-white hover:ring-1 hover:ring-accent"
                    } ${isToday && !isSelected ? "underline underline-offset-4" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" /> Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-danger" /> Sin cupo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/15" /> Cerrado
              </span>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="mb-3 text-[13.5px] text-white/50">
                {selectedDate
                  ? `Horarios para el ${WEEKDAYS_ES[selectedDate.getDay()]} ${selectedDate.getDate()} de ${MONTHS_ES[selectedDate.getMonth()]}`
                  : "Elige primero una fecha"}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                <AnimatePresence mode="wait">
                  {selectedDate && (
                    <motion.div
                      key={selectedDate.toISOString()}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="col-span-full grid grid-cols-3 gap-2 sm:grid-cols-4"
                    >
                      {slots.map((hour) => {
                        const pastHour = isSelectedToday && hour <= nowHour;
                        const soldOut = busyForSelected.includes(formatHour(hour));
                        const busy = pastHour || soldOut;
                        const isSelected = selectedHour === hour;
                        return (
                          <button
                            key={hour}
                            type="button"
                            disabled={busy}
                            onClick={() => setSelectedHour(hour)}
                            className={`h-10 rounded-lg text-[13px] font-medium transition-colors ${
                              isSelected
                                ? "bg-accent text-white"
                                : soldOut
                                  ? "text-danger/80 line-through"
                                  : busy
                                    ? "text-white/25"
                                    : "text-white ring-1 ring-white/10 hover:ring-accent"
                            }`}
                          >
                            {formatHour(hour)}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            {result ? (
              <div className="flex h-full flex-col items-center gap-4 rounded-3xl bg-white p-6 text-center sm:p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">¡Cita agendada, folio {result.id}!</h3>
                  <p className="mt-1 text-[13.5px] text-muted">
                    Guarda este código QR — lo escaneamos al llegar al taller para registrar tu cita al instante.
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.qrDataUrl} alt="Código QR de tu cita" className="h-40 w-40" />
                <div className="flex w-full flex-col items-center gap-2">
                  <a
                    href={result.whatsappUrl}
                    target="_blank"
                    rel="noopener"
                    className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-[#25D366] text-[15px] font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-[#1ebe5b] active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
                    </svg>
                    Confirmar cita por WhatsApp
                  </a>
                  <p className="text-[12px] text-muted">Se abre WhatsApp con los datos de tu cita ya escritos.</p>
                </div>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener"
                  className="text-[13px] font-semibold text-accent hover:underline"
                >
                  Ver mi cita
                </a>
                <button
                  onClick={bookAnother}
                  className="mt-2 h-10 rounded-full border border-black/10 px-5 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                >
                  Agendar otra cita
                </button>
              </div>
            ) : (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="flex h-full flex-col gap-4 rounded-3xl bg-white p-6 sm:p-8"
              >
                <div className="flex items-center gap-2.5 rounded-xl bg-accent/10 px-4 py-3 text-[13.5px] font-medium text-accent-dark">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className="shrink-0">
                    <path d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>
                    {selectedDate && selectedHour !== null
                      ? formatSelectionSummary(selectedDate, selectedHour)
                      : selectedDate
                        ? "Elige un horario disponible"
                        : "Sin fecha ni horario seleccionados"}
                  </span>
                </div>

                {submitError && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">{submitError}</p>
                )}

                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Nombre
                  <input
                    name="nombre"
                    type="text"
                    required
                    maxLength={MAX_LENGTH.name}
                    placeholder="Tu nombre"
                    autoComplete="name"
                    className="h-11 rounded-xl border border-black/10 px-3.5 text-[14.5px] text-[#1d1d1f] outline-none transition-colors focus:border-accent"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Teléfono
                  <input
                    name="telefono"
                    type="tel"
                    inputMode="tel"
                    required
                    maxLength={16}
                    onChange={(e) => {
                      e.target.value = formatPhoneInput(e.target.value);
                    }}
                    placeholder="10 dígitos"
                    autoComplete="tel"
                    className="h-11 rounded-xl border border-black/10 px-3.5 text-[14.5px] text-[#1d1d1f] outline-none transition-colors focus:border-accent"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Servicio de interés
                  <select
                    name="servicio"
                    value={servicio}
                    onChange={(e) => setServicio(e.target.value)}
                    className="h-11 rounded-xl border border-black/10 px-3.5 text-[14.5px] text-[#1d1d1f] outline-none transition-colors focus:border-accent"
                  >
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                    <option value={OTHER_SERVICE_VALUE}>Otro (cambio de un componente específico)</option>
                  </select>
                </label>

                {servicio === OTHER_SERVICE_VALUE && (
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                    ¿Qué componente quieres cambiar?
                    <input
                      type="text"
                      required
                      maxLength={MAX_LENGTH.service}
                      value={servicioOtro}
                      onChange={(e) => setServicioOtro(e.target.value)}
                      placeholder="Ej. cambiar asiento, cambiar manubrio…"
                      className="h-11 rounded-xl border border-black/10 px-3.5 text-[14.5px] text-[#1d1d1f] outline-none transition-colors focus:border-accent"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={!selectedDate || selectedHour === null || submitting}
                  className="mt-2 flex h-12 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:opacity-40"
                >
                  {submitting ? "Agendando…" : "Agendar cita"}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
