"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { formatMoney, waLink, reserveWhatsAppWindow, openWhatsApp, releaseWhatsAppWindow } from "@/lib/whatsapp";
import { placeOrder } from "@/lib/actions/orders";
import { MAX_LENGTH, PHONE_ERROR, formatPhoneInput, normalizePhone } from "@/lib/validation";

export function CartDrawer({ mpAvailable }: { mpAvailable: boolean }) {
  const cart = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [placing, setPlacing] = useState<"whatsapp" | "mercadopago" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Si el usuario navega a otra pantalla mientras placeOrder() sigue en
  // vuelo, este componente ya no existe cuando la respuesta llega —
  // actualizar su estado en ese momento es lo que tronaba en React.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canCheckout = cart.items.length > 0 && name.trim().length > 0 && normalizePhone(phone) !== null;

  async function checkout(payWithMercadoPago: boolean) {
    if (!canCheckout) {
      setError(name.trim() ? PHONE_ERROR : "Escribe tu nombre y teléfono para continuar.");
      return;
    }
    setError(null);
    // Se reserva aquí, dentro del clic: si se abre hasta que placeOrder()
    // responde, el navegador la bloquea y el pedido nunca llega por WhatsApp.
    const whatsappWindow = payWithMercadoPago ? null : reserveWhatsAppWindow();
    setPlacing(payWithMercadoPago ? "mercadopago" : "whatsapp");
    const res = await placeOrder({
      customer: name.trim(),
      phone: phone.trim(),
      items: cart.items,
      payWithMercadoPago,
    });
    if (!isMountedRef.current) {
      releaseWhatsAppWindow(whatsappWindow);
      return;
    }
    setPlacing(null);

    if (!res.ok) {
      releaseWhatsAppWindow(whatsappWindow);
      setError(res.error);
      return;
    }

    if (payWithMercadoPago && res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
      return;
    }

    const message =
      "Hola, quiero pedir:\n" +
      cart.items.map((item) => `- ${item.qty} x ${item.name} (${formatMoney(item.price)} c/u)`).join("\n") +
      `\nSubtotal: ${formatMoney(cart.total)}` +
      `\nFolio: ${res.order.id}`;
    openWhatsApp(whatsappWindow, waLink(message));
    cart.clear();
    cart.close();
  }

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cart.close}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            aria-label="Carrito de productos"
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">Tu carrito</h2>
              <button
                onClick={cart.close}
                aria-label="Cerrar carrito"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#1d1d1f]/60 hover:bg-black/5"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.items.length === 0 ? (
                <p className="pt-8 text-center text-[14px] text-muted">Aún no has agregado productos.</p>
              ) : (
                <>
                  <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {cart.items.map((item) => (
                        <motion.li
                          key={item.name}
                          layout
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-black/5 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold text-[#1d1d1f]">{item.name}</p>
                            <p className="text-[12.5px] text-muted">{formatMoney(item.price)}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              onClick={() => cart.changeQty(item.name, -1)}
                              aria-label={`Quitar uno de ${item.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/10 text-[#1d1d1f] hover:bg-black/5"
                            >
                              &minus;
                            </button>
                            <span className="w-4 text-center text-[13px] font-medium">{item.qty}</span>
                            <button
                              onClick={() => cart.changeQty(item.name, 1)}
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

                  <div className="mt-5 flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted">
                      Nombre
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={MAX_LENGTH.name}
                        autoComplete="name"
                        placeholder="Tu nombre"
                        className="h-10 rounded-xl border border-black/10 px-3 text-[13.5px] text-[#1d1d1f] outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted">
                      Teléfono
                      <input
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                        onBlur={() => setPhoneTouched(true)}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={16}
                        placeholder="10 dígitos"
                        className="h-10 rounded-xl border border-black/10 px-3 text-[13.5px] text-[#1d1d1f] outline-none focus:border-accent"
                      />
                      {phoneTouched && phone.trim() && !normalizePhone(phone) && (
                        <span className="text-[11.5px] text-red-600">{PHONE_ERROR}</span>
                      )}
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-black/5 px-6 py-5">
              {error && <p className="mb-3 text-[12.5px] font-medium text-red-600">{error}</p>}
              <div className="mb-3 flex items-center justify-between text-[15px]">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold text-[#1d1d1f]">{formatMoney(cart.total)}</span>
              </div>

              {mpAvailable && (
                <button
                  onClick={() => checkout(true)}
                  disabled={!canCheckout || placing !== null}
                  className="mb-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:opacity-40"
                >
                  {placing === "mercadopago" ? "Redirigiendo…" : "Pagar en línea"}
                </button>
              )}

              <button
                onClick={() => checkout(false)}
                disabled={!canCheckout || placing !== null}
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform disabled:opacity-40 ${
                  mpAvailable
                    ? "border border-black/10 text-[#1d1d1f] enabled:hover:bg-black/5"
                    : "bg-accent text-white enabled:hover:scale-[1.02] enabled:active:scale-[0.98]"
                }`}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm5.6 14.3c-.2.6-1.3 1.2-1.9 1.3-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4.2.5.7 1.8.8 1.9.1.2.1.3 0 .5-.1.2-.2.3-.3.5l-.5.5c-.2.2-.3.4-.1.7.2.3.7 1.2 1.6 1.9 1.1.9 2 1.2 2.3 1.4.3.1.5.1.6-.1.2-.2.6-.7.8-1 .2-.2.4-.2.6-.1l1.7.8c.2.1.4.2.4.4.1.2.1.7-.1 1.3z" />
                </svg>
                {placing === "whatsapp" ? "Enviando…" : "Pedir por WhatsApp"}
              </button>
              <p className="mt-2.5 text-center text-[12px] text-muted">
                {mpAvailable
                  ? "También puedes pagar al recoger, confirmando por WhatsApp."
                  : "Confirmamos disponibilidad y forma de pago por WhatsApp."}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
