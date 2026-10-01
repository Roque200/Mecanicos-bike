"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { LogoMark } from "./Logo";
import { useCart } from "@/lib/cart-context";
import { useQuote } from "@/lib/quote-context";

const LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#productos", label: "Productos" },
  { href: "#paquetes", label: "Paquetes" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart();
  const quote = useQuote();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dark = scrolled || menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        dark ? "bg-white/80 backdrop-blur-xl border-b border-black/5" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span
            className={`text-[15px] font-semibold tracking-tight transition-colors ${
              dark ? "text-[#1d1d1f]" : "text-white"
            }`}
          >
            Mecánicos Biker
          </span>
        </a>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`text-[13px] font-medium transition-colors ${
                    dark ? "text-[#1d1d1f]/80 hover:text-[#1d1d1f]" : "text-white/80 hover:text-white"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={quote.open}
            aria-label="Ver cotizador"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              dark ? "text-[#1d1d1f] hover:bg-black/5" : "text-white hover:bg-white/10"
            }`}
          >
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
              <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8.5 8h7M8.5 12h7M8.5 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            {quote.count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {quote.count}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={cart.open}
            aria-label="Ver carrito"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              dark ? "text-[#1d1d1f] hover:bg-black/5" : "text-white hover:bg-white/10"
            }`}
          >
            <motion.svg
              viewBox="0 0 24 24"
              width="19"
              height="19"
              fill="none"
              animate={cart.justAdded ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <path
                d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
              <circle cx="17" cy="20" r="1.4" fill="currentColor" />
            </motion.svg>
            {cart.count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </button>

          <a
            href="#contacto"
            className={`hidden sm:inline-flex h-9 items-center rounded-full px-4 text-[13px] font-semibold transition-colors ${
              dark ? "bg-[#1d1d1f] text-white hover:bg-black" : "bg-white text-[#1d1d1f] hover:bg-white/90"
            }`}
          >
            Agendar
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
            className={`md:hidden flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              dark ? "text-[#1d1d1f]" : "text-white"
            }`}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-black/5 bg-white/95 backdrop-blur-xl px-5 py-4"
        >
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-[#1d1d1f] hover:bg-black/5"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>
      )}
    </header>
  );
}
