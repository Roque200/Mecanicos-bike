"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  name: string;
  price: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  justAdded: boolean;
  count: number;
  total: number;
  addItem: (name: string, price: number) => void;
  changeQty: (name: string, delta: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "mecanicosBikerCart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time hydration from localStorage after mount, so server and
      // client render the same empty cart first and avoid a mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* localStorage unavailable — cart still works for this page view */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), 500);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  function addItem(name: string, price: number) {
    setItems((prev) => {
      const existing = prev.find((item) => item.name === name);
      if (existing) {
        return prev.map((item) => (item.name === name ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { name, price, qty: 1 }];
    });
    setJustAdded(true);
  }

  function changeQty(name: string, delta: number) {
    setItems((prev) =>
      prev
        .map((item) => (item.name === name ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  }

  // Estable (useCallback) para poder llamarla desde un efecto. Borra también
  // localStorage en el acto: si se vacía al cargar la página (al volver de
  // Mercado Pago), el efecto de hidratación de arriba corre después del de la
  // página hija y volvería a cargar el carrito viejo.
  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setItems((prev) => (prev.length === 0 ? prev : []));
  }, []);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        justAdded,
        count,
        total,
        addItem,
        changeQty,
        clear,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
