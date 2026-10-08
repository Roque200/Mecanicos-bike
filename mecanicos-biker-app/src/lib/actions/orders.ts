"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createOrder as dbCreateOrder,
  createManualSale as dbCreateManualSale,
  setOrderPreference,
  updateOrderStatus as dbUpdateOrderStatus,
  InvalidOrderError,
  ProductNotFoundError,
  type OrderStatus,
} from "@/lib/db";
import { createOrderPreference, mercadoPagoEnabled } from "@/lib/mercadopago";
import { requireAdmin } from "@/lib/require-admin";
import { allowAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit";

async function siteUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function placeOrder(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number }[];
  payWithMercadoPago: boolean;
}) {
  if (!(await allowAction("order"))) {
    return { ok: false as const, error: RATE_LIMIT_ERROR };
  }
  // Antes de crear el pedido: si no, se apartaba stock para un pago imposible.
  if (input.payWithMercadoPago && !mercadoPagoEnabled()) {
    return {
      ok: false as const,
      error: "El pago en línea todavía no está configurado. Usa 'Pedir por WhatsApp' mientras tanto.",
    };
  }
  let order;
  try {
    order = await dbCreateOrder({
      customer: input.customer,
      phone: input.phone,
      items: input.items,
      paymentMethod: input.payWithMercadoPago ? "mercadopago" : "whatsapp",
    });
  } catch (err) {
    if (err instanceof InvalidOrderError || err instanceof ProductNotFoundError) {
      return { ok: false as const, error: err.message };
    }
    throw err;
  }
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clientes");
  // La tienda no se regenera aquí: se actualiza sola cada minuto, y
  // regenerarla en cada pedido haría lento el botón de pedir.

  if (!input.payWithMercadoPago) {
    return { ok: true as const, order, checkoutUrl: null };
  }

  try {
    const base = await siteUrl();
    const preference = await createOrderPreference(order, base);
    const checkoutUrl = preference.init_point ?? preference.sandbox_init_point ?? null;
    if (!checkoutUrl) throw new Error("Mercado Pago no regresó liga de pago");
    if (preference.id) await setOrderPreference(order.id, preference.id);
    return { ok: true as const, order, checkoutUrl };
  } catch (err) {
    // Si Mercado Pago no responde, el pedido no se puede pagar: se cancela
    // para devolver su stock (antes quedaba apartado una hora) y el cliente
    // ve un mensaje en vez de quedarse en "Redirigiendo…".
    console.error("Mercado Pago: no se pudo crear el pago", err);
    await dbUpdateOrderStatus(order.id, "cancelado").catch(() => {});
    return {
      ok: false as const,
      error: "No pudimos conectar con Mercado Pago. Intenta de nuevo en un momento o pide por WhatsApp.",
    };
  }
}

export async function registerManualSale(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
}) {
  await requireAdmin();
  try {
    const order = await dbCreateManualSale(input);
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/ventas");
    revalidatePath("/tienda");
    return { ok: true as const, order };
  } catch (err) {
    if (err instanceof InvalidOrderError) return { ok: false as const, error: err.message };
    throw err;
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await requireAdmin();
  await dbUpdateOrderStatus(id, status);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/dashboard");
  // Cancelar o reactivar un pedido cambia el stock que muestra la tienda.
  revalidatePath("/tienda");
}
