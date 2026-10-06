import type { ReactNode } from "react";
import { LogoMark } from "./Logo";

/**
 * Pantalla de estado (página no encontrada, error) con el diseño del sitio.
 * `fullScreen` cuando no hay barra de navegación alrededor (rutas fuera del
 * sitio público); sin él, se acomoda dentro del layout con Navbar y Footer.
 */
export function StatusScreen({
  eyebrow,
  title,
  message,
  children,
  fullScreen = false,
}: {
  eyebrow: string;
  title: string;
  message: string;
  children?: ReactNode;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-surface px-6 ${
        fullScreen ? "min-h-screen py-16" : "min-h-[70vh] pb-20 pt-32"
      }`}
    >
      <div className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-8 text-center">
        <div className="mb-5 flex justify-center">
          <LogoMark className="h-10 w-10" />
        </div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
        <h1 className="mt-1 text-balance text-2xl font-semibold text-[#1d1d1f]">{title}</h1>
        <p className="mt-3 text-balance text-[14.5px] leading-relaxed text-muted">{message}</p>
        {children && <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">{children}</div>}
      </div>
    </div>
  );
}

export const primaryButtonClass =
  "flex h-11 items-center justify-center rounded-full bg-accent px-6 text-[14.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]";
export const secondaryButtonClass =
  "flex h-11 items-center justify-center rounded-full border border-black/10 px-6 text-[14.5px] font-semibold text-[#1d1d1f] transition-colors hover:bg-black/5";
