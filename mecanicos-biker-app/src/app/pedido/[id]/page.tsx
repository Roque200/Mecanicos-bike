import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrder, orderTotal } from "@/lib/db";
import { ORDER_STATUS_LABEL } from "@/lib/admin-data";
import { LogoMark } from "@/components/Logo";

const STATUS_COPY: Record<string, { title: string; tone: string }> = {
  pagado: { title: "¡Pago recibido!", tone: "text-emerald-600" },
  pendiente: { title: "Pago en proceso", tone: "text-amber-600" },
  entregado: { title: "Pedido entregado", tone: "text-emerald-600" },
  cancelado: { title: "Pedido cancelado", tone: "text-red-600" },
};

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const copy = STATUS_COPY[order.status] ?? { title: "Pedido recibido", tone: "text-[#1d1d1f]" };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 text-center">
        <div className="mb-5 flex justify-center">
          <LogoMark className="h-10 w-10" tone="black" />
        </div>
        <h1 className={`text-2xl font-semibold ${copy.tone}`}>{copy.title}</h1>
        <p className="mt-1 text-[13.5px] text-muted">Pedido {order.id}</p>

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
          href="/"
          className="mt-6 flex h-11 items-center justify-center rounded-full bg-[#1d1d1f] text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Volver al sitio
        </Link>
      </div>
    </main>
  );
}
