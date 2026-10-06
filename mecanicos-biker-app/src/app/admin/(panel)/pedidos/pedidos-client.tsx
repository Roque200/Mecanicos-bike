"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ORDER_STATUS_LABEL, orderTotal, type Order, type OrderStatus } from "@/lib/admin-data";
import { OrderStatusBadge } from "@/components/admin/StatusBadge";
import { updateOrderStatus } from "@/lib/actions/orders";
import { formatPhone } from "@/lib/validation";

const FILTERS: { value: OrderStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const STATUS_OPTIONS: OrderStatus[] = ["pendiente", "pagado", "entregado", "cancelado"];

const PAYMENT_LABEL: Record<Order["paymentMethod"], string> = {
  whatsapp: "WhatsApp",
  mercadopago: "Mercado Pago",
  mostrador: "Mostrador",
};

export function PedidosClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(
    () => orders.filter((o) => filter === "todos" || o.status === filter),
    [orders, filter],
  );

  function updateStatus(id: string, status: OrderStatus) {
    const previous = orders.find((o) => o.id === id)?.status;
    setStatusError(null);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    startTransition(async () => {
      try {
        await updateOrderStatus(id, status);
      } catch {
        if (previous) setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: previous } : o)));
        setStatusError("No se pudo actualizar el estado del pedido. Intenta de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {statusError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{statusError}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
              filter === f.value ? "bg-[#1d1d1f] text-white" : "bg-white text-muted hover:text-[#1d1d1f]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((order) => {
          const isOpen = expanded === order.id;
          return (
            <div key={order.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white">
              <button
                onClick={() => setExpanded(isOpen ? null : order.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-[13px] font-semibold text-muted">{order.id}</span>
                  <div>
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{order.customer}</p>
                    <p className="text-[12px] text-muted">
                      {order.date} · <span className="whitespace-nowrap">{formatPhone(order.phone)}</span> · {PAYMENT_LABEL[order.paymentMethod]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14.5px] font-semibold text-[#1d1d1f]">
                    ${orderTotal(order).toLocaleString("es-MX")} MXN
                  </span>
                  <OrderStatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
                  <motion.svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    className="text-muted"
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-black/5"
                  >
                    <div className="flex flex-col gap-2 px-5 py-4">
                      {order.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-[13.5px]">
                          <span className="text-[#1d1d1f]/80">
                            {item.qty} × {item.name}
                          </span>
                          <span className="text-[#1d1d1f]">${(item.price * item.qty).toLocaleString("es-MX")}</span>
                        </div>
                      ))}

                      <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-3">
                        <label className="text-[12.5px] font-medium text-muted">
                          Estado del pedido
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                            className="ml-2 h-8 rounded-lg border border-black/10 bg-white px-2 text-[12.5px] outline-none focus:border-accent"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {ORDER_STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-muted">
            No hay pedidos que coincidan con el filtro.
          </div>
        )}
      </div>
    </div>
  );
}
