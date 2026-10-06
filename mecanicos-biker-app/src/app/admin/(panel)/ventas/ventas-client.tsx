"use client";

import { useMemo, useState, useTransition } from "react";
import type { Order, Product } from "@/lib/admin-data";
import { orderTotal } from "@/lib/admin-data";
import { registerManualSale } from "@/lib/actions/orders";
import { formatPhoneInput } from "@/lib/validation";

type SaleItem = { id: string; name: string; price: number; qty: number; custom: boolean };

export function VentasClient({ products, initialSales }: { products: Product[]; initialSales: Order[] }) {
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [productToAdd, setProductToAdd] = useState("");
  const [sales, setSales] = useState<Order[]>(initialSales);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

  function addFromCatalog() {
    const product = products.find((p) => p.id === productToAdd);
    if (!product) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name: product.name, price: product.price, qty: 1, custom: false }]);
    setProductToAdd("");
  }

  function addCustomItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name: "", price: 0, qty: 1, custom: true }]);
  }

  function updateItem(id: string, patch: Partial<SaleItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function resetForm() {
    setCustomer("");
    setPhone("");
    setItems([]);
  }

  function submit() {
    setError(null);
    setSuccess(null);
    if (!customer.trim() || !phone.trim()) {
      setError("Escribe el nombre y teléfono del cliente.");
      return;
    }
    const payloadItems = items
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), qty: i.qty, price: i.price }));
    if (payloadItems.length === 0) {
      setError("Agrega al menos un concepto a la venta.");
      return;
    }
    startTransition(async () => {
      const res = await registerManualSale({ customer: customer.trim(), phone: phone.trim(), items: payloadItems });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSales((prev) => [res.order, ...prev]);
      setSuccess(`Venta ${res.order.id} registrada por $${orderTotal(res.order).toLocaleString("es-MX")} MXN.`);
      resetForm();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <p className="mb-4 text-[12.5px] text-muted">
          Registra aquí un trabajo o venta hecho directamente en el taller (venta de mostrador). Queda marcada como
          pagada de inmediato y se suma al corte junto con los pedidos en línea.
        </p>

        {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{error}</p>}
        {success && !error && (
          <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-700">{success}</p>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
            Cliente
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Nombre del cliente"
              className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
            Teléfono
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              type="tel"
              inputMode="tel"
              maxLength={16}
              placeholder="10 dígitos"
              className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="mb-5 flex flex-wrap items-end gap-2">
          <label className="flex flex-1 min-w-[220px] flex-col gap-1.5 text-[12.5px] font-medium text-muted">
            Producto del catálogo
            <select
              value={productToAdd}
              onChange={(e) => setProductToAdd(e.target.value)}
              className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price.toLocaleString("es-MX")} ({p.stock} pzas)
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addFromCatalog}
            disabled={!productToAdd}
            className="h-10 shrink-0 rounded-full border border-black/10 px-4 text-[13px] font-semibold text-[#1d1d1f] hover:bg-black/5 disabled:opacity-40"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={addCustomItem}
            className="h-10 shrink-0 rounded-full bg-[#1d1d1f] px-4 text-[13px] font-semibold text-white hover:opacity-90"
          >
            + Concepto libre (mano de obra)
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {items.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Aún no has agregado conceptos.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/5 p-3">
              {item.custom ? (
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Ej. mano de obra, instalación…"
                  className="h-9 min-w-[160px] flex-1 rounded-lg border border-black/10 px-2.5 text-[13.5px] outline-none focus:border-accent"
                />
              ) : (
                <span className="min-w-[160px] flex-1 text-[13.5px] font-medium text-[#1d1d1f]">{item.name}</span>
              )}
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) => updateItem(item.id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                className="h-9 w-16 rounded-lg border border-black/10 px-2 text-center text-[13.5px] outline-none focus:border-accent"
              />
              <span className="text-[13px] text-muted">×</span>
              <input
                type="number"
                min="0"
                value={item.price}
                onChange={(e) => updateItem(item.id, { price: Math.max(0, Number(e.target.value) || 0) })}
                className="h-9 w-24 rounded-lg border border-black/10 px-2 text-[13.5px] outline-none focus:border-accent"
              />
              <span className="w-24 text-right text-[13.5px] font-semibold text-[#1d1d1f]">
                ${(item.price * item.qty).toLocaleString("es-MX")}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                aria-label={`Quitar ${item.name || "concepto"}`}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
          <span className="text-[15px] font-semibold text-[#1d1d1f]">Total: ${total.toLocaleString("es-MX")} MXN</span>
          <button
            onClick={submit}
            disabled={isPending || items.length === 0}
            className="flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] disabled:opacity-40"
          >
            {isPending ? "Registrando…" : "Registrar venta"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-[#1d1d1f]">Ventas de mostrador recientes</h2>
        <div className="flex flex-col divide-y divide-black/5">
          {sales.length === 0 && <p className="py-4 text-center text-[13px] text-muted">Aún no hay ventas de mostrador.</p>}
          {sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-[#1d1d1f]">{sale.customer}</p>
                <p className="truncate text-[12.5px] text-muted">
                  {sale.id} · {sale.date} · {sale.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                </p>
              </div>
              <span className="shrink-0 text-[14px] font-semibold text-[#1d1d1f]">
                ${orderTotal(sale).toLocaleString("es-MX")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
