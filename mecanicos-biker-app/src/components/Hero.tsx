"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { LogoBadge } from "./Logo";
import { staggerContainer, staggerItem } from "./Reveal";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden bg-[#050505] pt-16"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[60vw] w-[60vw] max-w-[720px] max-h-[720px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 py-20 text-center sm:px-8"
      >
        <motion.p
          variants={staggerItem}
          className="text-[13px] font-semibold uppercase tracking-[0.2em] text-accent"
        >
          Taller especializado en MTB
        </motion.p>

        <motion.h1
          variants={staggerItem}
          className="max-w-4xl text-balance text-[13vw] font-semibold leading-[0.98] tracking-tight text-white sm:text-7xl md:text-8xl"
        >
          Tu bici en las
          <br />
          mejores manos.
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="max-w-xl text-balance text-lg text-white/60 sm:text-xl"
        >
          Suspensión, frenos, transmisión y mantenimiento general para
          bicicletas de montaña. Técnicos certificados y garantía por
          escrito.
        </motion.p>

        <motion.div variants={staggerItem} className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/paquetes#contacto"
            className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Agendar cita
          </Link>
          <a
            href="#servicios"
            className="inline-flex h-12 items-center gap-1.5 rounded-full border border-white/20 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            Ver servicios
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </motion.div>

        <motion.div
          variants={staggerItem}
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4"
        >
          <LogoBadge className="h-40 w-40 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:h-48 sm:w-48" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40"
      >
        <motion.svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
