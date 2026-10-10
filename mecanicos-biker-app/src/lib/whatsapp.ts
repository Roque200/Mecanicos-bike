export const WHATSAPP_NUMBER = "524312125098";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Enlace de WhatsApp hacia un número de cliente en particular (no el del taller). */
export function waLinkTo(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}

// El navegador solo deja abrir una pestaña nueva como respuesta directa a un
// clic. Si se abre hasta que el servidor contesta (agendar la cita o guardar
// el pedido tarda unos segundos), el clic ya "caducó" y Chrome/Safari la
// bloquean sin avisar. Por eso la pestaña se reserva en el mismo clic y,
// cuando llega la respuesta, se manda a WhatsApp con el mensaje ya armado.
export function reserveWhatsAppWindow(): Window | null {
  const win = window.open("", "_blank");
  if (!win) return null;
  try {
    win.opener = null;
    win.document.title = "Abriendo WhatsApp…";
    win.document.body.style.cssText =
      "margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font:15px system-ui,sans-serif;color:#6e6e73";
    win.document.body.textContent = "Abriendo WhatsApp…";
  } catch {
    // Solo es el texto de espera; si el navegador no deja escribirlo, no pasa nada.
  }
  return win;
}

/** Manda la pestaña reservada a WhatsApp; si no se pudo reservar, intenta abrir una nueva. */
export function openWhatsApp(reserved: Window | null, url: string): boolean {
  if (reserved && !reserved.closed) {
    reserved.location.href = url;
    return true;
  }
  return window.open(url, "_blank", "noopener") !== null;
}

/** Cierra la pestaña reservada cuando la operación falló y ya no hay nada que enviar. */
export function releaseWhatsAppWindow(reserved: Window | null) {
  if (reserved && !reserved.closed) reserved.close();
}

export function formatMoney(amount: number) {
  return `$${amount.toLocaleString("es-MX")} MXN`;
}
