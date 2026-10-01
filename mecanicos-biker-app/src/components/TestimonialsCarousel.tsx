"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Testimonial } from "@/lib/admin-data";

function Stars({ count }: { count: number }) {
  return (
    <div className="mb-4 flex justify-center gap-0.5 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" width="16" height="16" fill="currentColor" opacity={i < count ? 1 : 0.25}>
          <path d="M10 1l2.8 5.7 6.2.9-4.5 4.4 1 6.2L10 15l-5.5 3.2 1-6.2L1 7.6l6.2-.9z" />
        </svg>
      ))}
    </div>
  );
}

const AUTO_ADVANCE_MS = 5500;

export function TestimonialsCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const count = testimonials.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [next, count]);

  if (count === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-[14.5px] text-muted">
        Todavía no hay testimonios publicados — ¡sé el primero en dejar el tuyo!
      </p>
    );
  }

  const t = testimonials[index];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative min-h-[260px] overflow-hidden rounded-3xl bg-white p-8 text-center sm:p-10">
        <AnimatePresence mode="wait">
          <motion.figure
            key={t.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <Stars count={t.stars} />
            <blockquote className="text-[16px] leading-relaxed text-[#1d1d1f]">&ldquo;{t.quote}&rdquo;</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-[13px] font-semibold text-white">
                {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
              <div className="text-left">
                <p className="text-[13.5px] font-semibold text-[#1d1d1f]">{t.name}</p>
                {t.role && <p className="text-[12.5px] text-muted">{t.role}</p>}
              </div>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={prev}
            aria-label="Testimonio anterior"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-[#1d1d1f]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex gap-1.5">
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir al testimonio ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-accent" : "w-1.5 bg-black/15"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Siguiente testimonio"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-[#1d1d1f]"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
