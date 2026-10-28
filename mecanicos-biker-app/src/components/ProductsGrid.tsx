"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { useQuote } from "@/lib/quote-context";
import { formatMoney, waLink } from "@/lib/whatsapp";
import type { Product, ProductCategory, SecondHandItem } from "@/lib/db";
import { UploadedPhoto } from "./UploadedPhoto";

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

function CategoryIcon({ category, className = "" }: { category: ProductCategory; className?: string }) {
  return (
    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent ${className}`}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
        {CATEGORY_ICON[category]}
      </svg>
    </span>
  );
}

type CatalogItem = { kind: "product"; data: Product } | { kind: "segunda-mano"; data: SecondHandItem };

const ACTION_BUTTON =
  "h-8 rounded-full border border-[#1d1d1f]/15 px-3 text-[12.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40";

function ProductActions({ product, onDone }: { product: Product; onDone?: () => void }) {
  const cart = useCart();
  const quote = useQuote();
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        onClick={() => {
          quote.addProduct(product.name);
          onDone?.();
        }}
        className={ACTION_BUTTON}
      >
        Cotizar
      </button>
      <button
        onClick={() => {
          cart.addItem(product.name, product.price);
          onDone?.();
        }}
        disabled={product.stock <= 0}
        className={ACTION_BUTTON}
      >
        {product.stock <= 0 ? "Agotado" : "Agregar"}
      </button>
    </div>
  );
}

function SecondHandAction({ item }: { item: SecondHandItem }) {
  return (
    <a
      href={waLink(`Hola, me interesa esta pieza de segunda mano: ${item.name} (${formatMoney(item.price)}). ¿Sigue disponible?`)}
      target="_blank"
      rel="noopener"
      className={ACTION_BUTTON}
    >
      Preguntar
    </a>
  );
}

/**
 * Descripción cortada a 3 líneas. "Ver más" aparece solo si de verdad no cabe
 * (se mide en pantalla: el mismo texto cabe en una tarjeta ancha y no en una
 * angosta) o si trae saltos de línea que en la tarjeta no se ven.
 */
function CardDescription({ text, onMore }: { text: string; onMore: () => void }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setTruncated(el.scrollHeight > el.clientHeight + 1 || text.includes("\n"));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div className="mb-4 flex-1">
      <p ref={ref} className="line-clamp-3 text-[13px] leading-relaxed text-muted">
        {text}
      </p>
      {truncated && (
        <button onClick={onMore} className="mt-1 text-[12.5px] font-semibold text-accent hover:underline">
          Ver más
        </button>
      )}
    </div>
  );
}

function photosOf(item: CatalogItem): string[] {
  if (item.kind === "product") return item.data.imagePaths;
  return item.data.imagePath ? [item.data.imagePath] : [];
}

const GALLERY_ARROW =
  "absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1d1d1f] shadow-sm ring-1 ring-black/10 hover:bg-white disabled:opacity-0";

/**
 * Galería de la ventana de detalle. Es un carrusel con scroll-snap: en el
 * celular se desliza con el dedo de forma nativa; las flechas y miniaturas
 * solo lo desplazan.
 */
function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }

  const onScroll = () => {
    const track = trackRef.current;
    if (track) setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <div className="border-b border-black/5 bg-white">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((path, i) => (
            <div key={path} className="flex h-56 w-full shrink-0 snap-center items-center justify-center sm:h-72">
              <UploadedPhoto
                imagePath={path}
                alt={photos.length > 1 ? `${alt} (foto ${i + 1} de ${photos.length})` : alt}
                className="h-full w-full object-contain p-4"
                fallback={null}
              />
            </div>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <button onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Foto anterior" className={`left-3 ${GALLERY_ARROW}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => goTo(active + 1)}
              disabled={active === photos.length - 1}
              aria-label="Foto siguiente"
              className={`right-3 ${GALLERY_ARROW}`}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-[#1d1d1f]/75 px-2 py-0.5 text-[11px] font-semibold text-white">
              {active + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex justify-center gap-2 px-6 pb-4">
          {photos.map((path, i) => (
            <button
              key={path}
              onClick={() => goTo(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === active}
              className={`h-12 w-12 overflow-hidden rounded-lg border-2 bg-white transition-colors ${
                i === active ? "border-accent" : "border-black/10 hover:border-black/30"
              }`}
            >
              <UploadedPhoto imagePath={path} alt="" className="h-full w-full object-contain" fallback={null} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ventana con la descripción completa: hoja desde abajo en celular, centrada en computadora. */
function DetailDialog({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // La página de atrás no se desplaza mientras la ventana está abierta.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const { data } = item;
  const photos = photosOf(item);
  const label =
    item.kind === "product"
      ? FILTERS.find((f) => f.value === item.data.category)?.label
      : `Segunda mano · ${item.data.condition}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1d1d1f] shadow-sm ring-1 ring-black/5 hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="overflow-y-auto">
          {photos.length > 0 && <PhotoGallery photos={photos} alt={data.name} />}
          <div className="p-6 pr-14">
            <span className="text-[11px] font-bold uppercase tracking-wide text-accent">{label}</span>
            <h3 id="product-detail-title" className="mt-1 text-lg font-semibold leading-snug text-[#1d1d1f]">
              {data.name}
            </h3>
          </div>
          {/* whitespace-pre-line: respeta los saltos de línea escritos en el panel. */}
          <p className="whitespace-pre-line px-6 pb-6 text-[14px] leading-relaxed text-[#1d1d1f]/75">{data.description}</p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-black/5 bg-white px-6 py-4">
          <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(data.price)}</span>
          {item.kind === "product" ? <ProductActions product={item.data} onDone={onClose} /> : <SecondHandAction item={item.data} />}
        </div>
      </motion.div>
    </div>
  );
}

export function ProductsGrid({ products, secondHand }: { products: Product[]; secondHand: SecondHandItem[] }) {
  const [filter, setFilter] = useState<Category>("todos");
  const [detail, setDetail] = useState<CatalogItem | null>(null);

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

  const closeDetail = useCallback(() => setDetail(null), []);

  return (
    <>
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`relative h-9 rounded-full px-4 text-[13.5px] font-medium transition-all duration-200 ${
              filter === f.value ? "text-white" : "text-[#1d1d1f]/70 hover:scale-105 hover:text-[#1d1d1f]"
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
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white p-6 transition-shadow duration-300 hover:shadow-lg"
              >
                {item.data.imagePaths.length > 0 ? (
                  // Portada completa (object-contain): las fotos de producto
                  // suelen ir sobre fondo blanco y no conviene recortarlas.
                  // Al tocarla se abre la ventana con todas las fotos.
                  <button
                    onClick={() => setDetail(item)}
                    aria-label={`Ver fotos de ${item.data.name}`}
                    className="relative -mx-6 -mt-6 mb-5 flex h-44 items-center justify-center border-b border-black/5 bg-white"
                  >
                    <UploadedPhoto
                      key={item.data.imagePaths[0]}
                      imagePath={item.data.imagePaths[0]}
                      alt={item.data.name}
                      className="h-full w-full object-contain p-3"
                      fallback={<CategoryIcon category={item.data.category} />}
                    />
                    {item.data.imagePaths.length > 1 && (
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-[#1d1d1f]/75 px-2 py-0.5 text-[11px] font-semibold text-white">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {item.data.imagePaths.length}
                      </span>
                    )}
                  </button>
                ) : (
                  <CategoryIcon category={item.data.category} className="mb-4" />
                )}
                <span className="mb-1 text-[11px] font-bold uppercase tracking-wide text-accent">
                  {FILTERS.find((f) => f.value === item.data.category)?.label}
                </span>
                <h3 className="mb-1.5 text-[15.5px] font-semibold leading-snug text-[#1d1d1f]">{item.data.name}</h3>
                <CardDescription text={item.data.description} onMore={() => setDetail(item)} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(item.data.price)}</span>
                  <ProductActions product={item.data} />
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
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white transition-shadow duration-300 hover:shadow-lg"
              >
                <div className="flex h-28 items-center justify-center bg-surface">
                  <UploadedPhoto key={item.data.imagePath} imagePath={item.data.imagePath} alt={item.data.name} />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-accent">
                    Segunda mano · {item.data.condition}
                  </span>
                  <h3 className="text-[15.5px] font-semibold leading-snug text-[#1d1d1f]">{item.data.name}</h3>
                  <CardDescription text={item.data.description} onMore={() => setDetail(item)} />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold text-[#1d1d1f]">{formatMoney(item.data.price)}</span>
                    <SecondHandAction item={item.data} />
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

      <AnimatePresence>{detail && <DetailDialog key={detail.data.id} item={detail} onClose={closeDetail} />}</AnimatePresence>
    </>
  );
}
