import Image from "next/image";

const LOGO_SRC = "/logo-mecanicos-biker.png";
// Intrinsic size of the source file — required by next/image, overridden on
// screen by whatever h-*/w-* the caller passes in `className`.
const LOGO_WIDTH = 1109;
const LOGO_HEIGHT = 1205;

/** The client's artwork, with its flat background removed so it reads correctly on any surface. */
function LogoGlyph({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <Image
        src={LOGO_SRC}
        alt="Mecánicos Bike"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="absolute inset-0 h-full w-full object-contain"
        priority={priority}
        // Es una imagen con detalle fino — el optimizador de Vercel la
        // recomprime y se ve borrosa, así que se sirve tal cual.
        unoptimized
      />
    </span>
  );
}

/** Full badge, used large (e.g. the hero) — loaded eagerly since it's likely above the fold. */
export function LogoBadge({ className }: { className?: string }) {
  return <LogoGlyph className={className} priority />;
}

/**
 * Same artwork, used in tight spaces like a nav slot. El logo es blanco: sobre
 * un círculo oscuro se ve igual en fondos claros (barra al hacer scroll,
 * login, páginas de cita y pedido) que en los oscuros (menú, pie de página).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#0b0b0c] ${className ?? ""}`}>
      <LogoGlyph className="h-[84%] w-[84%]" />
    </span>
  );
}
