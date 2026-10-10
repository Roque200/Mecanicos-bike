// Catálogo de servicios que se ofrecen al agendar una cita — sin dependencias
// de servidor, para que tanto el formulario público como db.ts (al otorgar
// puntos de recompensa) puedan importarlo.

export type ServiceOption = { name: string; points: number };

export const SERVICE_OPTIONS: ServiceOption[] = [
  { name: "Servicio básico", points: 1 },
  { name: "Servicio intermedio", points: 2 },
  { name: "Servicio avanzado", points: 3 },
  { name: "Servicio de frenos", points: 2 },
  { name: "Servicio de dropper", points: 1 },
  { name: "Servicio de shifter y desviador", points: 1 },
  { name: "Relleno de líquido sellador", points: 1 },
  { name: "Alineación de rines", points: 1 },
  { name: "Cambio de mazas", points: 1 },
  { name: "Cambio de rayos de rin", points: 1 },
];

/**
 * Evento que lanza el botón "Elegir …" de cada paquete (Pricing) para que el
 * formulario de citas (Booking) deje seleccionado ese servicio. Lleva en
 * `detail` el nombre exacto de una opción de SERVICE_OPTIONS.
 */
export const SELECT_SERVICE_EVENT = "mb:select-service";

/** Valor que el <select> usa para revelar el campo de texto libre. */
export const OTHER_SERVICE_VALUE = "otro";
export const DEFAULT_SERVICE_POINTS = 1;

export function pointsForService(serviceName: string): number {
  return SERVICE_OPTIONS.find((s) => s.name === serviceName)?.points ?? DEFAULT_SERVICE_POINTS;
}
