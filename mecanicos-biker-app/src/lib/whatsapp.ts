export const WHATSAPP_NUMBER = "524612315670";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Enlace de WhatsApp hacia un número de cliente en particular (no el del taller). */
export function waLinkTo(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

export function formatMoney(amount: number) {
  return `$${amount.toLocaleString("es-MX")} MXN`;
}
