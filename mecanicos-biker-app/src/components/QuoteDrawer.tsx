"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuote } from "@/lib/quote-context";
import { waLink } from "@/lib/whatsapp";

export function QuoteDrawer() {
  const quote = useQuote();
  const [customText, setCustomText] = useState("");

  function addCustom() {
    quote.addCustomItem(customText);
    setCustomText("");
  }

  function sendQuote() {
    const lines = quote.items.map((item) => `- ${item.qty} x ${item.name}`);
    const message = "Hola, quiero pedir una cotización de:\n" + lines.join("\n");
    window.open(waLink(message), "_blank", "noopener");
    quote.clear();
    quote.close();
  }

  return (
    <AnimatePresence>
      {quote.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={quote.close}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            aria-label="Cotizador de piezas"
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">Cotizar piezas</h2>
              <button
                onClick={quote.close}
                aria-label="Cerrar cotizador"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d1d1f]/60 hover:bg-black/5"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="mb-4 text-[12.5px] text-muted">
                Junta las piezas que quieres cotizar y mándanoslas por WhatsApp — te contestamos con el precio.
              </p>

              {quote.items.length === 0 ? (
                <p className="pt-4 text-center text-[14px] text-muted">Aún no has agregado piezas.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {quote.items.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-black/5 p-3"
                      >
                        <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#1d1d1f]">{item.name}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => quote.changeQty(item.id, -1)}
                            aria-label={`Quitar uno de ${item.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-[#1d1d1f] hover:bg-black/5"
                          >
                            &minus;
                          </button>
                          <span className="w-4 text-center text-[13px] font-medium">{item.qty}</span>
                          <button
                            onClick={() => quote.changeQty(item.id, 1)}
                            aria-label={`Agregar uno de ${item.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-[#1d1d1f] hover:bg-black/5"
                          >
                            +
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}

              <div className="mt-5 flex flex-col gap-2">
                <label className="text-[12.5px] font-medium text-muted">¿No la ves en el catálogo?</label>
                <div className="flex gap-2">
                  <input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Describe la pieza que buscas"
                    className="h-10 flex-1 rounded-xl border border-black/10 px-3 text-[13.5px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    disabled={!customText.trim()}
                    className="h-10 shrink-0 rounded-xl border border-black/10 px-3.5 text-[13px] font-semibold text-[#1d1d1f] hover:bg-black/5 disabled:opacity-40"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-black/5 px-6 py-5">
              <button
                onClick={sendQuote}
                disabled={quote.items.length === 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14.3c-.2.6-1.3 1.2-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5l-.5.5c-.2.2-.3.4-.1.7.2.3.7 1.2 1.6 1.9 1.1.9 2 1.2 2.3 1.4.3.1.5.1.6-.1.2-.2.6-.7.8-1 .2-.2.4-.2.6-.1l1.7.8c.2.1.4.2.4.4.1.2.1.7-.1 1.3z" />
                </svg>
                Enviar cotización por WhatsApp
              </button>
              <p className="mt-2.5 text-center text-[12px] text-muted">No se guarda en ningún lado — solo abre WhatsApp.</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
