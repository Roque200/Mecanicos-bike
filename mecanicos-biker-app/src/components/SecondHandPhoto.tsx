"use client";

import { useState } from "react";

/** Foto de un artículo de segunda mano; si falta o no carga, "Sin foto" en vez del ícono de imagen rota. */
export function SecondHandPhoto({ imagePath, alt }: { imagePath: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!imagePath || failed) {
    return <span className="text-[12.5px] text-muted">Sin foto</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/uploads/${imagePath}`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
