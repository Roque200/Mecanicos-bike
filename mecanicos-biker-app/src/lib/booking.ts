export const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const WEEKDAYS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

export type WeeklyDaySchedule = {
  dayOfWeek: number; // 0 = domingo ... 6 = sábado
  isOpen: boolean;
  openHour: number;
  closeHour: number; // última hora en la que se puede agendar (no la hora de cierre del local)
};

export type ScheduleOverride = {
  date: string; // yyyy-mm-dd
  closed: boolean;
  openHour: number | null;
  closeHour: number | null;
  note: string | null;
};

/** Zero-padded ISO date (yyyy-mm-dd), matching the format stored in the database. */
export function isoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// El taller opera en hora del centro de México, pero Vercel corre en UTC: si
// "hoy" o "la hora actual" se sacan del reloj del servidor, desde las 6 pm
// las ventas quedan con fecha de mañana y la validación de citas rechaza
// horarios que el calendario sí muestra libres. Todo "ahora" pasa por aquí.
export const BUSINESS_TIME_ZONE = "America/Mexico_City";

const businessClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Fecha (yyyy-mm-dd) y hora (0-23) actuales en la zona del taller. */
export function businessNow(at: Date = new Date()): { dateKey: string; hour: number } {
  const parts = Object.fromEntries(businessClock.formatToParts(at).map((p) => [p.type, p.value]));
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

/** Medianoche local de una fecha yyyy-mm-dd, para pintarla en el calendario. */
export function dateFromKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Suma (o resta) días a una fecha yyyy-mm-dd sin depender de la zona horaria. */
export function addDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function hourRange(open: number, close: number): number[] {
  const hours: number[] = [];
  for (let h = open; h <= close; h++) hours.push(h);
  return hours;
}

/**
 * Horas agendables para una fecha, según el horario semanal configurado por
 * el administrador y cualquier excepción para ese día en particular. La
 * misma función corre en el calendario del cliente y en la validación del
 * servidor, para que nunca queden desincronizados.
 */
export function computeHoursForDate(
  date: Date,
  weekly: WeeklyDaySchedule[],
  overrides: Record<string, ScheduleOverride>,
): number[] {
  const override = overrides[isoDate(date)];
  const day = weekly.find((w) => w.dayOfWeek === date.getDay());
  if (override) {
    if (override.closed) return [];
    const open = override.openHour ?? day?.openHour;
    const close = override.closeHour ?? day?.closeHour;
    if (open == null || close == null || open > close) return [];
    return hourRange(open, close);
  }
  if (!day || !day.isOpen || day.openHour > day.closeHour) return [];
  return hourRange(day.openHour, day.closeHour);
}

export function formatHour(hour: number) {
  return `${hour < 10 ? "0" + hour : hour}:00`;
}

export function formatLongDate(date: Date) {
  const dayName = WEEKDAYS_ES[date.getDay()];
  return `${dayName} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatSelectionSummary(date: Date, hour: number) {
  const dayName = WEEKDAYS_ES[date.getDay()];
  const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalized} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}, ${formatHour(hour)} hrs`;
}
