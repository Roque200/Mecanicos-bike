import { Reveal } from "./Reveal";

export function SectionHeader({
  eyebrow,
  title,
  desc,
  light,
  as: Heading = "h2",
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  light?: boolean;
  /** "h1" cuando es el título principal de la página (/paquetes, /tienda). */
  as?: "h1" | "h2";
}) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center sm:mb-20">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <Heading
        className={`text-balance text-4xl font-semibold tracking-tight sm:text-5xl ${
          light ? "text-white" : "text-[#1d1d1f]"
        }`}
      >
        {title}
      </Heading>
      {desc && (
        <p className={`mt-4 text-balance text-lg ${light ? "text-white/60" : "text-muted"}`}>{desc}</p>
      )}
    </Reveal>
  );
}
