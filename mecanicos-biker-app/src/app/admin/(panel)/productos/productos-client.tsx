"use client";

import { useState, useTransition, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CATEGORY_LABEL, type Product } from "@/lib/admin-data";
import { createProduct, deleteProduct, updateProduct } from "@/lib/actions/products";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Product["category"][];

const EMPTY_FORM = {
  name: "",
  category: "componentes" as Product["category"],
  description: "",
  price: "",
  stock: "",
  lowStockThreshold: "",
};

export function ProductosClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
    });
    setFormError(null);
    setModalOpen(true);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // El navegador bloquea el envío sin avisar bien si un campo numérico no
    // es válido (ej. un decimal en "Stock") — mostramos el aviso nativo en
    // vez de dejar que no pase nada.
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      price: Math.round(Number(form.price)) || 0,
      stock: Math.round(Number(form.stock)) || 0,
      lowStockThreshold: Math.round(Number(form.lowStockThreshold)) || 0,
    };
    if (!payload.name) return;

    if (editingId) {
      const id = editingId;
      const previous = products.find((p) => p.id === id);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
      setModalOpen(false);
      startTransition(async () => {
        const res = await updateProduct(id, payload);
        if (!res.ok) {
          if (previous) setProducts((prev) => prev.map((p) => (p.id === id ? previous : p)));
          setFormError(res.error);
          setEditingId(id);
          setModalOpen(true);
        }
      });
    } else {
      const tempId = `tmp-${Date.now()}`;
      setProducts((prev) => [...prev, { id: tempId, ...payload }]);
      setModalOpen(false);
      startTransition(async () => {
        const res = await createProduct(payload);
        if (res.ok) {
          setProducts((prev) => prev.map((p) => (p.id === tempId ? res.product : p)));
        } else {
          setProducts((prev) => prev.filter((p) => p.id !== tempId));
          setFormError(res.error);
          setModalOpen(true);
        }
      });
    }
  }

  function removeProduct(id: string) {
    const previous = products;
    setListError(null);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    startTransition(async () => {
      try {
        await deleteProduct(id);
      } catch {
        setProducts(previous);
        setListError("No se pudo eliminar el producto. Intenta de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {listError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{listError}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-muted">{products.length} productos en catálogo</p>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuevo producto
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-black/5 text-[12px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Producto</th>
              <th className="px-5 py-3 font-semibold">Categoría</th>
              <th className="px-5 py-3 font-semibold">Precio</th>
              <th className="px-5 py-3 font-semibold">Stock</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {products.map((p) => {
              const low = p.stock <= p.lowStockThreshold;
              return (
                <tr key={p.id} className="transition-colors hover:bg-surface/60">
                  <td className="px-5 py-3.5 font-medium text-[#1d1d1f]">{p.name}</td>
                  <td className="px-5 py-3.5 text-[#1d1d1f]/70">{CATEGORY_LABEL[p.category]}</td>
                  <td className="px-5 py-3.5 text-[#1d1d1f]/70">${p.price.toLocaleString("es-MX")}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                        low ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {p.stock} pzas
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-[#1d1d1f]"
                        aria-label={`Editar ${p.name}`}
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => removeProduct(p.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 1, scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6"
            >
              <h2 className="mb-5 text-lg font-semibold text-[#1d1d1f]">
                {editingId ? "Editar producto" : "Nuevo producto"}
              </h2>
              {formError && (
                <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{formError}</p>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Nombre
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Descripción
                  <textarea
                    required
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="resize-none rounded-xl border border-black/10 px-3 py-2 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Categoría
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as Product["category"] })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                    Precio (MXN)
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                    Stock
                    <input
                      required
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Alertar cuando el stock baje de
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-10 flex-1 rounded-full border border-black/10 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="h-10 flex-1 rounded-full bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-dark"
                  >
                    {editingId ? "Guardar cambios" : "Agregar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
