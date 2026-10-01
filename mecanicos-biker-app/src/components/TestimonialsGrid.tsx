"use client";

import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "./Reveal";
import type { Testimonial } from "@/lib/admin-data";

function Stars({ count }: { count: number }) {
  return (
    <div className="mb-4 flex gap-0.5 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" width="15" height="15" fill="currentColor" opacity={i < count ? 1 : 0.25}>
          <path d="M10 1l2.8 5.7 6.2.9-4.5 4.4 1 6.2L10 15l-5.5 3.2 1-6.2L1 7.6l6.2-.9z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsGrid({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) {
    return (
      <p className="mx-auto max-w-md text-center text-[14.5px] text-muted">
        Todavía no hay testimonios publicados — ¡sé el primero en dejar el tuyo!
      </p>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="grid grid-cols-1 gap-5 md:grid-cols-3"
    >
      {testimonials.map((t) => (
        <motion.figure key={t.id} variants={staggerItem} className="flex flex-col rounded-3xl bg-white p-7">
          <Stars count={t.stars} />
          <blockquote className="flex-1 text-[15px] leading-relaxed text-[#1d1d1f]">&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-[13px] font-semibold text-white">
              {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#1d1d1f]">{t.name}</p>
              {t.role && <p className="text-[12.5px] text-muted">{t.role}</p>}
            </div>
          </figcaption>
        </motion.figure>
      ))}
    </motion.div>
  );
}
