"use client";

import { useState, type ReactNode } from "react";

/**
 * Foto subida desde el panel (productos y segunda mano). Si falta o no carga,
 * muestra `fallback` ("Sin foto" por defecto) en vez del ícono de imagen rota.
 */
export function UploadedPhoto({
  imagePath,
  alt,
  className = "h-full w-full object-cover",
  fallback = <span className="text-[12.5px] text-muted">Sin foto</span>,
}: {
  imagePath: string | null;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (!imagePath || failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/uploads/${imagePath}`} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}
