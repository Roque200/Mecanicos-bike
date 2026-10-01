"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { useQuote } from "@/lib/quote-context";
import { formatMoney, waLink } from "@/lib/whatsapp";
import type { Product, ProductCategory, SecondHandItem } from "@/lib/db";

type Category = ProductCategory | "todos" | "segunda-mano";

const FILTERS: { value: Category; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "componentes", label: "Componentes" },
  { value: "accesorios", label: "Accesorios" },
  { value: "cuidado", label: "Cuidado" },
  { value: "herramientas", label: "Herramientas" },
  { value: "segunda-mano", label: "Segunda mano" },
];

const CATEGORY_ICON: Record<ProductCategory, ReactNode> = {
  accesorios: (
    <>
      <path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 16h16M8 16v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  componentes: (
    <>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="1.5" width="2" height="3" rx="1" fill="currentColor" />
    </>
  ),
  cuidado: (
    <>
      <path d="M9 3h6v3l2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-2V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  herramientas: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
};

type CatalogItem = { kind: "product"; data: Product } | { kind: "segunda-mano"; data: SecondHandItem };

export function ProductsGrid({ products, secondHand }: { products: Product[]; secondHand: SecondHandItem[] }) {
  const [filter, setFilter] = useState<Category>("todos");
  const cart = useCart();
  const quote = useQuote();

  const catalog: CatalogItem[] = useMemo(
    () => [
      ...products.map((p): CatalogItem => ({ kind: "product", data: p })),
      ...secondHand.map((s): CatalogItem => ({ kind: "segunda-mano", data: s })),
    ],
    [products, secondHand],
  );

  const visible =
    filter === "todos"
      ? catalog
      : filter === "segunda-mano"
        ? catalog.filter((c) => c.kind === "segunda-mano")
        : catalog.filter((c) => c.kind === "product" && c.data.category === filter);

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`relative h-9 rounded-full px-4 text-[13.5px] font-medium transition-colors ${
              filter === f.value ? "text-white" : "text-[#1d1d1f]/70 hover:text-[#1d1d1f]"
            }`}
          >
            {filter === f.value && (
              <motion.span
                layoutId="filter-pill"
                className="absolute inset-0 rounded-full bg-[#1d1d1f]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative">{f.label}</span>
          </button>
        ))}
      </div>

      <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {visible.map((item) =>
            item.kind === "product" ? (
              <motion.div
                key={item.data.id}
                data-testid={`product-${item.data.id}`}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col rounded-3xl border border-black/5 bg-white p-6"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                    {CATEGORY_ICON[item.data.category]}
                  </svg>
                </span>
                <span className="mb-1 text-[11px] font-bold uppercase tracking-wide text-accent">
                  {FILTERS.find((f) => f.value === item.data.category)?.label}
                </span>
                <h3 className="mb-1.5 text-[15.5px] font-semibold leading-snug text-[#1d1d1f]">{item.data.name}</h3>
                <p className="mb-4 flex-1 text-[13px] leading-relaxed text-muted">{item.data.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(item.data.price)}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => quote.addProduct(item.data.name)}
                      className="h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white"
                    >
                      Cotizar
                    </button>
                    <button
                      onClick={() => cart.addItem(item.data.name, item.data.price)}
                      disabled={item.data.stock <= 0}
                      className="h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40"
                    >
                      {item.data.stock <= 0 ? "Agotado" : "Agregar"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={item.data.id}
                data-testid={`secondhand-${item.data.id}`}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white"
              >
                <div className="flex h-28 items-center justify-center bg-surface">
                  {item.data.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/uploads/${item.data.imagePath}`}
                      alt={item.data.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[12.5px] text-muted">Sin foto</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
                    Segunda mano · {item.data.condition}
                  </span>
                  <h3 className="text-[15.5px] font-semibold leading-snug text-[#1d1d1f]">{item.data.name}</h3>
                  <p className="mb-2 flex-1 text-[13px] leading-relaxed text-muted">{item.data.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(item.data.price)}</span>
                    <a
                      href={waLink(
                        `Hola, me interesa esta pieza de segunda mano: ${item.data.name} (${formatMoney(item.data.price)}). ¿Sigue disponible?`,
                      )}
                      target="_blank"
                      rel="noopener"
                      className="h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white"
                    >
                      Preguntar
                    </a>
                  </div>
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="col-span-full rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-muted">
            No hay artículos en esta categoría por ahora.
          </div>
        )}
      </motion.div>
    </>
  );
}
