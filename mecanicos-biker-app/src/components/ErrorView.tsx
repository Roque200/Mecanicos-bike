"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusScreen, primaryButtonClass, secondaryButtonClass } from "./StatusScreen";

/** Lo que muestran los error.tsx: en vez de la pantalla genérica en inglés, una con opción de reintentar. */
export function ErrorView({
  error,
  retry,
  fullScreen,
  homeHref = "/",
  homeLabel = "Ir al inicio",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  fullScreen?: boolean;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      eyebrow="Algo salió mal"
      title="No pudimos cargar esta página"
      message="Puede ser un problema momentáneo de conexión. Intenta de nuevo en unos segundos."
      fullScreen={fullScreen}
    >
      <button type="button" onClick={() => retry()} className={primaryButtonClass}>
        Intentar de nuevo
      </button>
      <Link href={homeHref} className={secondaryButtonClass}>
        {homeLabel}
      </Link>
    </StatusScreen>
  );
}
