"use server";

import { listOrdersInRange, listCompletedAppointmentsInRange, orderTotal, type Order, type PaymentMethod } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { formatPhone } from "@/lib/validation";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  whatsapp: "WhatsApp",
  mercadopago: "Mercado Pago",
  mostrador: "Mostrador (efectivo)",
};

// Solo cuenta como corte el dinero que realmente entró — un pedido
// "pendiente" todavía no se ha cobrado y uno "cancelado" nunca se cobró.
const COUNTED_STATUSES = new Set(["pagado", "entregado"]);

function csvCell(value: string | number) {
  let text = String(value);
  // Los nombres y servicios los escribe el público. Si un texto empieza con
  // = + - @ (o tab/retorno), Excel lo ejecuta como fórmula al abrir el corte
  // (p. ej. =HYPERLINK(...) para sacar datos). El apóstrofo hace que lo
  // muestre como texto. Los montos son números y no pasan por aquí.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: (string | number)[]) {
  return values.map(csvCell).join(",");
}

export async function exportCashCut(from: string, to: string) {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return { ok: false as const, error: "Rango de fechas inválido." };
  }

  const [allOrders, appointments] = await Promise.all([
    listOrdersInRange(from, to),
    listCompletedAppointmentsInRange(from, to),
  ]);
  const orders = allOrders.filter((o) => COUNTED_STATUSES.has(o.status));

  const lines = [
    csvRow(["Pedidos y ventas"]),
    csvRow(["Fecha", "Folio", "Cliente", "Teléfono", "Método de pago", "Total (MXN)"]),
    ...orders.map((o: Order) =>
      csvRow([o.date, o.id, o.customer, formatPhone(o.phone), PAYMENT_LABEL[o.paymentMethod], orderTotal(o)]),
    ),
  ];

  lines.push("");
  lines.push(csvRow(["Citas completadas"]));
  lines.push(csvRow(["Fecha de cobro", "Folio", "Cliente", "Teléfono", "Servicio", "Monto cobrado (MXN)"]));
  for (const a of appointments) {
    lines.push(csvRow([a.completedAt ?? a.date, a.id, a.customer, formatPhone(a.phone), a.service, a.amount ?? 0]));
  }

  const subtotals = new Map<PaymentMethod, number>();
  for (const o of orders) subtotals.set(o.paymentMethod, (subtotals.get(o.paymentMethod) ?? 0) + orderTotal(o));
  const appointmentsTotal = appointments.reduce((sum, a) => sum + (a.amount ?? 0), 0);
  const ordersTotal = orders.reduce((sum, o) => sum + orderTotal(o), 0);
  const grandTotal = ordersTotal + appointmentsTotal;

  lines.push("");
  lines.push(csvRow(["Resumen"]));
  for (const method of Object.keys(PAYMENT_LABEL) as PaymentMethod[]) {
    lines.push(csvRow([PAYMENT_LABEL[method], subtotals.get(method) ?? 0]));
  }
  lines.push(csvRow(["Citas completadas", appointmentsTotal]));
  lines.push(csvRow(["Total general", grandTotal]));

  const csv = lines.join("\n");
  const filename = `corte-mecanicos-bike_${from}_a_${to}.csv`;
  return { ok: true as const, csv, filename };
}
