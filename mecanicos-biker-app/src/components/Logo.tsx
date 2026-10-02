import Image from "next/image";

const LOGO_SRC = "/logo-mecanicos-biker.png";
// Intrinsic size of the source file — required by next/image, overridden on
// screen by whatever h-*/w-* the caller passes in `className`.
const LOGO_WIDTH = 1254;
const LOGO_HEIGHT = 1254;

/** The client's artwork, used exactly as provided (white background included). */
function LogoGlyph({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <Image
        src={LOGO_SRC}
        alt="Mecánicos Bike"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="absolute inset-0 h-full w-full"
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

/** Same artwork, used in tight spaces like a nav slot. */
export function LogoMark({ className }: { className?: string }) {
  return <LogoGlyph className={className} />;
}
