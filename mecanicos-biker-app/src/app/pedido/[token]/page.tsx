import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByPublicToken, orderTotal, type Order } from "@/lib/db";
import { confirmMercadoPagoPayment } from "@/lib/payments";
import { ORDER_STATUS_LABEL } from "@/lib/admin-data";
import { LogoMark } from "@/components/Logo";
import { ClearCart } from "@/components/ClearCart";

export const metadata: Metadata = {
  title: "Tu pedido",
  robots: { index: false },
};

// Mercado Pago regresa aquí con ?collection_status=…&status=… Si el pago se
// aprobó o quedó en proceso, el pedido ya está hecho y el carrito se vacía.
// Si se rechazó o el cliente canceló, se conserva para que pueda reintentar.
// (El webhook puede tardar unos segundos en marcar el pedido como pagado, por
// eso no basta con revisar el estado del pedido.)
const PAYMENT_DONE = new Set(["approved", "pending", "in_process"]);
const PAYMENT_FAILED = new Set(["rejected", "cancelled", "null"]);

type Headline = { title: string; tone: string; note?: string; retry?: boolean };

function headlineFor(order: Order, paymentStatus: string): Headline {
  switch (order.status) {
    case "pagado":
      return { title: "¡Pago recibido!", tone: "text-emerald-600", note: "Te avisamos por WhatsApp cuando tu pedido esté listo." };
    case "entregado":
      return { title: "Pedido entregado", tone: "text-emerald-600" };
    case "cancelado":
      return {
        title: "Pedido cancelado",
        tone: "text-red-600",
        note: "Este pedido se canceló y no se hizo ningún cobro. Si crees que es un error, escríbenos por WhatsApp.",
      };
  }
  if (order.paymentMethod === "whatsapp") {
    return { title: "Pedido recibido", tone: "text-[#1d1d1f]", note: "Te confirmamos disponibilidad y forma de pago por WhatsApp." };
  }
  if (paymentStatus === "approved") {
    return { title: "¡Pago aprobado!", tone: "text-emerald-600", note: "Estamos registrando tu pago; en unos segundos se verá aquí." };
  }
  if (paymentStatus === "pending" || paymentStatus === "in_process") {
    return {
      title: "Pago en proceso",
      tone: "text-amber-600",
      note: "Mercado Pago está revisando tu pago. En cuanto se confirme, se verá aquí.",
    };
  }
  if (PAYMENT_FAILED.has(paymentStatus)) {
    return {
      title: "Pago no completado",
      tone: "text-red-600",
      note: "No se hizo ningún cobro. Tus productos siguen en el carrito para que lo intentes de nuevo.",
      retry: true,
    };
  }
  return { title: "Pago pendiente", tone: "text-amber-600", note: "Todavía no recibimos el pago de este pedido." };
}

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  let order = await getOrderByPublicToken(token);
  if (!order) notFound();

  const paymentStatus = String(query.collection_status ?? query.status ?? "");
  // Red de seguridad por si el aviso (webhook) de Mercado Pago no llega o se
  // retrasa: si el cliente regresa con un pago aprobado, se confirma aquí
  // mismo preguntándole a Mercado Pago. El parámetro de la URL no basta para
  // marcar nada: confirmMercadoPagoPayment verifica estado, pedido y monto.
  const paymentId = String(query.payment_id ?? query.collection_id ?? "");
  if (
    order.paymentMethod === "mercadopago" &&
    (order.status === "pendiente" || order.status === "cancelado") &&
    paymentStatus === "approved" &&
    paymentId
  ) {
    try {
      if ((await confirmMercadoPagoPayment(paymentId, order.id)) === "paid") {
        order = (await getOrderByPublicToken(token)) ?? order;
      }
    } catch (err) {
      console.error("Mercado Pago: no se pudo confirmar el pago al regresar", err);
    }
  }
  const clearCart =
    order.status === "pagado" || order.status === "entregado" || PAYMENT_DONE.has(paymentStatus);
  const headline = headlineFor(order, paymentStatus);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      {clearCart && <ClearCart />}
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 text-center">
        <div className="mb-5 flex justify-center">
          <LogoMark className="h-10 w-10" />
        </div>
        <h1 className={`text-2xl font-semibold ${headline.tone}`}>{headline.title}</h1>
        <p className="mt-1 text-[13.5px] text-muted">Pedido {order.id}</p>
        {headline.note && <p className="mt-3 text-balance text-[13.5px] text-[#1d1d1f]/70">{headline.note}</p>}

        <div className="mt-6 flex flex-col gap-2 text-left text-[14px] text-[#1d1d1f]/80">
          {order.items.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <span>
                {item.qty} × {item.name}
              </span>
              <span>${(item.price * item.qty).toLocaleString("es-MX")}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-3 font-semibold text-[#1d1d1f]">
            <span>Total</span>
            <span>${orderTotal(order).toLocaleString("es-MX")} MXN</span>
          </div>
        </div>

        <p className="mt-6 text-[13px] font-medium text-muted">Estado: {ORDER_STATUS_LABEL[order.status]}</p>

        <Link
          href={headline.retry ? "/tienda" : "/"}
          className="mt-6 flex h-11 items-center justify-center rounded-full bg-[#1d1d1f] text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {headline.retry ? "Volver a la tienda" : "Volver al sitio"}
        </Link>
      </div>
    </main>
  );
}
