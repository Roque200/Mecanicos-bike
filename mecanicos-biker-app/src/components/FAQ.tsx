"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "¿Cuánto tiempo tarda un servicio completo?",
    a: "Un servicio completo (afinación de 30 puntos) toma entre 24 y 48 horas según carga de taller. El servicio express de ajustes básicos se entrega el mismo día.",
  },
  {
    q: "¿Trabajan con todas las marcas de bicicleta?",
    a: "Sí. Atendemos cualquier marca y modelo de bicicleta de montaña, y somos centro autorizado para servicio de suspensión FOX.",
  },
  {
    q: "¿Dan garantía por el trabajo realizado?",
    a: "Todos nuestros servicios incluyen garantía por escrito: 30 días en mano de obra y la garantía del fabricante en refacciones originales.",
  },
  {
    q: "¿Puedo ver el diagnóstico antes de autorizar la reparación?",
    a: "Siempre. Te enviamos la cotización detallada por WhatsApp antes de tocar cualquier pieza, y solo procedemos con tu autorización.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="preguntas" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        <SectionHeader eyebrow="Dudas comunes" title="Preguntas frecuentes" />

        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.05} y={16}>
                <div
                  className={`overflow-hidden rounded-2xl border bg-surface transition-colors duration-300 ${
                    isOpen ? "border-accent/20" : "border-black/5 hover:border-accent/15 hover:bg-white"
                  }`}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[15px] font-medium text-[#1d1d1f]">{item.q}</span>
                    <motion.svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="shrink-0 text-accent"
                    >
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </motion.svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-[14px] leading-relaxed text-muted">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
