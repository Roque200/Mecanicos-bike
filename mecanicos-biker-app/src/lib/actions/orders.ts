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

async function siteUrl() {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function isOnlinePaymentAvailable() {
  return mercadoPagoEnabled();
}

export async function placeOrder(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number }[];
  payWithMercadoPago: boolean;
}) {
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
  revalidatePath("/");

  if (!input.payWithMercadoPago) {
    return { ok: true as const, order, checkoutUrl: null };
  }

  if (!mercadoPagoEnabled()) {
    return {
      ok: false as const,
      error: "El pago en línea todavía no está configurado. Usa 'Pedir por WhatsApp' mientras tanto.",
    };
  }

  const base = await siteUrl();
  const preference = await createOrderPreference(order, base);
  if (preference.id) await setOrderPreference(order.id, preference.id);
  const checkoutUrl = preference.init_point ?? preference.sandbox_init_point ?? null;
  return { ok: true as const, order, checkoutUrl };
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
  revalidatePath("/");
}
