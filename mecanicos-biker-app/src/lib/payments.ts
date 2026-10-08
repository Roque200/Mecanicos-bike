import { getOrder, markOrderPaid, orderTotal } from "@/lib/db";
import { fetchPayment } from "@/lib/mercadopago";

export type PaymentConfirmation = "paid" | "already-paid" | "not-approved" | "mismatch" | "not-found";

function httpStatusOf(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/**
 * Confirma un pago preguntándole directo a Mercado Pago (nunca se confía en
 * lo que diga quien nos llama) y, si está aprobado y el monto cuadra con el
 * total real del pedido, lo marca pagado. Lo usan el webhook y la página a la
 * que regresa el cliente, por si el aviso de Mercado Pago nunca llega.
 *
 * Lanza error si Mercado Pago no responde, para que el webhook conteste con
 * error y Mercado Pago reintente el aviso más tarde.
 */
export async function confirmMercadoPagoPayment(paymentId: string, expectedOrderId?: string): Promise<PaymentConfirmation> {
  if (!/^\d{1,20}$/.test(paymentId)) return "not-found";

  let payment;
  try {
    payment = await fetchPayment(paymentId);
  } catch (err) {
    // Un id que no existe (aviso falso o de otra cuenta) no se reintenta.
    if (httpStatusOf(err) === 404) return "not-found";
    throw err;
  }

  // external_reference = folio del pedido (se fija al crear la preferencia).
  const orderId = payment.external_reference;
  if (!orderId || (expectedOrderId && orderId !== expectedOrderId)) return "mismatch";
  if (payment.status !== "approved") return "not-approved";

  const order = await getOrder(orderId);
  if (!order) return "mismatch";
  const paid = payment.transaction_amount;
  // Nunca se marca pagado sin comparar contra el total real del pedido en la
  // base: así no se puede "pagar" un pedido con un monto distinto.
  if (paid == null || Math.round(paid) !== Math.round(orderTotal(order))) {
    console.error("Mercado Pago: el monto no coincide con el pedido", { orderId, expected: orderTotal(order), paid });
    return "mismatch";
  }

  const updated = await markOrderPaid(orderId, String(payment.id));
  return updated ? "paid" : "already-paid";
}
