"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { useQuote } from "@/lib/quote-context";
import { formatMoney } from "@/lib/whatsapp";
import type { Product, ProductCategory } from "@/lib/db";

type Category = ProductCategory | "todos";

const FILTERS: { value: Category; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "componentes", label: "Componentes" },
  { value: "accesorios", label: "Accesorios" },
  { value: "cuidado", label: "Cuidado" },
  { value: "herramientas", label: "Herramientas" },
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

export function ProductsGrid({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<Category>("todos");
  const cart = useCart();
  const quote = useQuote();
  const visible = filter === "todos" ? products : products.filter((p) => p.category === filter);

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
          {visible.map((product) => (
            <motion.div
              key={product.id}
              data-testid={`product-${product.id}`}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col rounded-3xl border border-black/5 bg-white p-6"
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                  {CATEGORY_ICON[product.category]}
                </svg>
              </span>
              <span className="mb-1 text-[11px] font-bold uppercase tracking-wide text-accent">
                {FILTERS.find((f) => f.value === product.category)?.label}
              </span>
              <h3 className="mb-1.5 text-[15.5px] font-semibold leading-snug text-[#1d1d1f]">{product.name}</h3>
              <p className="mb-4 flex-1 text-[13px] leading-relaxed text-muted">{product.description}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(product.price)}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => quote.addProduct(product.name)}
                    className="h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white"
                  >
                    Cotizar
                  </button>
                  <button
                    onClick={() => cart.addItem(product.name, product.price)}
                    disabled={product.stock <= 0}
                    className="h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40"
                  >
                    {product.stock <= 0 ? "Agotado" : "Agregar"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
