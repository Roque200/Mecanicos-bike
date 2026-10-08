import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { ORDER_HOLD_HOURS, type Order } from "./db";

export function mercadoPagoEnabled() {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  return new MercadoPagoConfig({ accessToken });
}

export async function createOrderPreference(order: Order & { publicToken: string }, baseUrl: string) {
  const preference = new Preference(client());
  const result = await preference.create({
    // El cliente está esperando frente al botón de pagar: por defecto la
    // librería espera hasta 60 s por intento y reintenta 3 veces. Si Mercado
    // Pago no responde, mejor avisar pronto y que intente de nuevo.
    requestOptions: { timeout: 8000, maxRetries: 1 },
    body: {
      external_reference: order.id,
      items: order.items.map((item) => ({
        id: item.name,
        title: item.name,
        quantity: item.qty,
        unit_price: item.price,
        currency_id: "MXN",
      })),
      payer: { name: order.customer },
      back_urls: {
        success: `${baseUrl}/pedido/${order.publicToken}`,
        pending: `${baseUrl}/pedido/${order.publicToken}`,
        failure: `${baseUrl}/pedido/${order.publicToken}`,
      },
      auto_return: "approved",
      // El link de pago vence antes de que el pedido se cancele solo y su
      // stock se libere (releaseExpiredOrders), con 5 minutos de margen.
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + (ORDER_HOLD_HOURS.mercadopago * 60 - 5) * 60_000).toISOString(),
      notification_url: `${baseUrl}/api/mercadopago/webhook`,
    },
  });
  return result;
}

export async function fetchPayment(paymentId: string) {
  const payment = new Payment(client());
  return payment.get({ id: paymentId });
}
