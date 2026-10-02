import Image from "next/image";

// Two color variants of the same artwork (transparent background): white
// line art for dark surfaces, black line art for light/white surfaces. Pick
// whichever reads against the background behind it.
const SOURCES = {
  white: { src: "/logo-mecanicos-biker-white.png", width: 1114, height: 1134 },
  black: { src: "/logo-mecanicos-biker-black.png", width: 720, height: 716 },
} as const;

type LogoTone = keyof typeof SOURCES;

function LogoGlyph({
  className,
  priority,
  tone = "white",
}: {
  className?: string;
  priority?: boolean;
  tone?: LogoTone;
}) {
  const { src, width, height } = SOURCES[tone];
  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <Image
        src={src}
        alt="Mecánicos Biker"
        width={width}
        height={height}
        className="absolute inset-0 h-full w-full"
        priority={priority}
        // El trazo es fino y queda borroso si el optimizador de Vercel lo
        // recomprime (calidad ~75 por defecto) — el archivo ya pesa poco, así
        // que se sirve tal cual para mantenerlo nítido.
        unoptimized
      />
    </span>
  );
}

/** Full badge, used large (e.g. the hero) — loaded eagerly since it's likely above the fold. */
export function LogoBadge({ className, tone }: { className?: string; tone?: LogoTone }) {
  return <LogoGlyph className={className} tone={tone} priority />;
}

/** Same artwork, used in tight spaces like a nav slot. */
export function LogoMark({ className, tone }: { className?: string; tone?: LogoTone }) {
  return <LogoGlyph className={className} tone={tone} />;
}
