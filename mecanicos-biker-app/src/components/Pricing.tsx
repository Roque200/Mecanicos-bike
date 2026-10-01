"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { SectionHeader } from "./SectionHeader";
import { staggerContainer, staggerItem } from "./Reveal";

const PLATOS = ["Mono plato", "Tri/doble plato"] as const;
const FRENOS = ["Shimano", "Sram"] as const;
type Plato = (typeof PLATOS)[number];
type Frenos = (typeof FRENOS)[number];

const NORMAL_PRICE: Record<Plato, number> = {
  "Mono plato": 480,
  "Tri/doble plato": 500,
};

const INTERMEDIO_PRICE: Record<Plato, Record<Frenos, number>> = {
  "Mono plato": { Shimano: 930, Sram: 980 },
  "Tri/doble plato": { Shimano: 950, Sram: 1000 },
};

const TIERS = [
  {
    name: "Normal",
    desc: "Bicicleta rígida y doble suspensión.",
    price: NORMAL_PRICE["Mono plato"],
    features: ["Limpieza y lavado general de la bicicleta.", "Lavado de cadena en tina ultrasónica."],
    greasing: [
      "Tazas de dirección.",
      "Eje central.",
      "Par de masas.",
      "Cambio de chicote de velocidades (nuevo, de acero inoxidable).",
      "Ajuste de velocidades.",
    ],
  },
  {
    name: "Intermedio",
    desc: "Todo lo del paquete Normal, más frenos.",
    price: INTERMEDIO_PRICE["Mono plato"].Shimano,
    featured: true,
    features: ["Limpieza y lavado general de la bicicleta.", "Lavado de cadena en tina ultrasónica."],
    greasing: [
      "Tazas de dirección.",
      "Eje central.",
      "Par de masas.",
      "Cambio de chicote de velocidades (nuevo, de acero inoxidable).",
      "Ajuste de velocidades.",
      "Cambio de líquido hidráulico especial para frenos MTB.",
      "Purga de frenos.",
      "Descontaminación de discos y pastillas de frenado.",
    ],
    note: "Tazas de dirección: de cartucho se reemplazan, de balero sellado se engrasan. Manos: de balero se reemplazan, de balero sellado se reemplazan.",
  },
  {
    name: "Avanzado",
    desc: "Todo lo del Intermedio, más servicio a la suspensión.",
    // Precio pendiente — varía según marca y sistema de suspensión.
    price: 1650,
    features: ["Limpieza y lavado general de la bicicleta.", "Lavado de cadena en tina ultrasónica."],
    greasing: [
      "Tazas de dirección.",
      "Eje central.",
      "Par de masas.",
      "Cambio de chicote de velocidades (nuevo, de acero inoxidable).",
      "Ajuste de velocidades.",
      "Cambio de líquido hidráulico especial para frenos MTB.",
      "Purga de frenos.",
      "Descontaminación de discos y pastillas de frenado.",
    ],
    suspension: ["Mecánica.", "Hidráulica.", "Neumática."],
  },
];

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  featured,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  featured?: boolean;
}) {
  return (
    <div className="mt-4">
      <p className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${featured ? "text-white/50" : "text-muted"}`}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active
                  ? "bg-accent text-white"
                  : featured
                    ? "bg-white/10 text-white/70 hover:bg-white/15"
                    : "bg-black/5 text-[#1d1d1f]/70 hover:bg-black/10"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Pricing() {
  const [normalPlato, setNormalPlato] = useState<Plato>("Mono plato");
  const [intPlato, setIntPlato] = useState<Plato>("Mono plato");
  const [intFrenos, setIntFrenos] = useState<Frenos>("Shimano");

  return (
    <section id="paquetes" className="bg-white pb-24 pt-32 sm:pb-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader eyebrow="Paquetes" title="Elige el nivel de servicio" desc="Precios claros, sin sorpresas al final." />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {TIERS.map((tier) => {
            const price =
              tier.name === "Normal"
                ? NORMAL_PRICE[normalPlato]
                : tier.name === "Intermedio"
                  ? INTERMEDIO_PRICE[intPlato][intFrenos]
                  : tier.price;

            return (
              <motion.div
                key={tier.name}
                variants={staggerItem}
                className={`relative flex flex-col rounded-3xl border p-8 ${
                  tier.featured
                    ? "border-transparent bg-[#1d1d1f] text-white shadow-xl md:-translate-y-3"
                    : "border-black/5 bg-surface text-[#1d1d1f]"
                }`}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Más popular
                  </span>
                )}
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className={`mt-1 text-[13.5px] ${tier.featured ? "text-white/60" : "text-muted"}`}>{tier.desc}</p>

                {tier.name === "Normal" && (
                  <PillGroup label="Transmisión" options={PLATOS} value={normalPlato} onChange={setNormalPlato} />
                )}
                {tier.name === "Intermedio" && (
                  <>
                    <PillGroup label="Transmisión" options={PLATOS} value={intPlato} onChange={setIntPlato} featured />
                    <PillGroup label="Frenos" options={FRENOS} value={intFrenos} onChange={setIntFrenos} featured />
                  </>
                )}

                <p className="mt-6 text-4xl font-semibold">
                  ${price.toLocaleString("es-MX")}
                  <span className={`ml-1 text-sm font-normal ${tier.featured ? "text-white/50" : "text-muted"}`}>MXN</span>
                </p>
                {tier.name === "Avanzado" && (
                  <p className="mt-1 text-[12px] text-muted">Cotización final según marca y sistema de suspensión.</p>
                )}

                <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2 text-[13.5px] leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span className={tier.featured ? "text-white/75" : "text-[#1d1d1f]/75"}>{f}</span>
                    </li>
                  ))}

                  <li className={`mt-1 text-[12px] font-semibold uppercase tracking-wide ${tier.featured ? "text-white/50" : "text-muted"}`}>
                    Engrasado
                  </li>
                  {tier.greasing.map((f) => (
                    <li key={f} className="flex gap-2 text-[13.5px] leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span className={tier.featured ? "text-white/75" : "text-[#1d1d1f]/75"}>{f}</span>
                    </li>
                  ))}

                  {tier.suspension && (
                    <>
                      <li className={`mt-1 text-[12px] font-semibold uppercase tracking-wide ${tier.featured ? "text-white/50" : "text-muted"}`}>
                        Servicio a la suspensión
                      </li>
                      {tier.suspension.map((f) => (
                        <li key={f} className="flex gap-2 text-[13.5px] leading-relaxed">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span className={tier.featured ? "text-white/75" : "text-[#1d1d1f]/75"}>{f}</span>
                        </li>
                      ))}
                    </>
                  )}
                </ul>

                {tier.note && (
                  <p className={`mt-4 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed ${tier.featured ? "bg-white/10 text-white/60" : "bg-black/5 text-muted"}`}>
                    {tier.note}
                  </p>
                )}
                <a
                  href="#contacto"
                  className={`mt-8 flex h-11 items-center justify-center rounded-full text-[14px] font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                    tier.featured ? "bg-accent text-white" : "bg-[#1d1d1f] text-white"
                  }`}
                >
                  Elegir {tier.name.toLowerCase()}
                </a>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
