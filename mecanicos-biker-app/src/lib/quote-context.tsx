"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type QuoteItem = { id: string; name: string; qty: number };

type QuoteContextValue = {
  items: QuoteItem[];
  isOpen: boolean;
  count: number;
  addProduct: (name: string) => void;
  addCustomItem: (description: string) => void;
  changeQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const QuoteContext = createContext<QuoteContextValue | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  function addProduct(name: string) {
    setItems((prev) => {
      const existing = prev.find((item) => item.name === name);
      if (existing) return prev.map((item) => (item.name === name ? { ...item, qty: item.qty + 1 } : item));
      return [...prev, { id: crypto.randomUUID(), name, qty: 1 }];
    });
    setIsOpen(true);
  }

  function addCustomItem(description: string) {
    const name = description.trim();
    if (!name) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), name, qty: 1 }]);
  }

  function changeQty(id: string, delta: number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item)).filter((item) => item.qty > 0),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function clear() {
    setItems([]);
  }

  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  return (
    <QuoteContext.Provider
      value={{
        items,
        isOpen,
        count,
        addProduct,
        addCustomItem,
        changeQty,
        removeItem,
        clear,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuote() {
  const ctx = useContext(QuoteContext);
  if (!ctx) throw new Error("useQuote must be used within a QuoteProvider");
  return ctx;
}
