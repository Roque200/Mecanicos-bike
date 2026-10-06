"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/** Vacía el carrito al montarse — se usa al volver de un pago con Mercado Pago. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
