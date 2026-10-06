// Reglas de los datos que llegan de los formularios públicos (citas, carrito,
// testimonios). Las usan tanto los formularios — para avisar antes de enviar —
// como el servidor, que es quien de verdad las hace cumplir: cualquiera puede
// llamar a las acciones del servidor sin pasar por la página.

export const MAX_LENGTH = {
  name: 80,
  service: 120,
  testimonialRole: 80,
  testimonialQuote: 1000,
  orderItemName: 120,
} as const;

export const MAX_ORDER_LINES = 50;
export const MAX_QTY_PER_LINE = 99;

/**
 * Deja el teléfono en 10 dígitos (formato de México) o regresa null si no
 * lo es. Acepta espacios, guiones, paréntesis y el prefijo +52 / +52 1.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local =
    digits.length === 12 && digits.startsWith("52")
      ? digits.slice(2)
      : digits.length === 13 && digits.startsWith("521")
        ? digits.slice(3)
        : digits;
  return /^\d{10}$/.test(local) ? local : null;
}

export const PHONE_ERROR = "Escribe un teléfono de 10 dígitos.";
