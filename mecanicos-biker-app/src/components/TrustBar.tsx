"use client";

import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "./Reveal";

const ITEMS = [
  {
    title: "Técnicos certificados",
    desc: "Capacitación directa de marca",
    icon: (
      <path
        d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Refacciones originales",
    desc: "Compatibles con tu modelo exacto",
    icon: <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Garantía por escrito",
    desc: "En mano de obra y refacciones",
    icon: (
      <path
        d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Servicio express",
    desc: "Afinaciones listas en 24h",
    icon: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
  },
];

export function TrustBar() {
  return (
    <section className="border-y border-black/5 bg-white py-10">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 sm:px-8 md:grid-cols-4"
      >
        {ITEMS.map((item) => (
          <motion.div
            key={item.title}
            variants={staggerItem}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="group flex items-start gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                {item.icon}
              </svg>
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[#1d1d1f]">{item.title}</p>
              <p className="text-[12.5px] text-muted">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
