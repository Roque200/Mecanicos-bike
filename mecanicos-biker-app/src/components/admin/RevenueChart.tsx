"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { RevenueGranularity, RevenueSeries } from "@/lib/admin-data";

const OPTIONS: { value: RevenueGranularity; label: string; title: string }[] = [
  { value: "day", label: "Día", title: "últimos 14 días" },
  { value: "week", label: "Semana", title: "últimas 12 semanas" },
  { value: "month", label: "Mes", title: "últimos 12 meses" },
];

function money(value: number) {
  return `$${value.toLocaleString("es-MX")}`;
}

export function RevenueChart({ series }: { series: RevenueSeries }) {
  const [granularity, setGranularity] = useState<RevenueGranularity>("day");
  const [active, setActive] = useState<number | null>(null);

  const buckets = series[granularity];
  const option = OPTIONS.find((o) => o.value === granularity)!;
  const max = Math.max(0, ...buckets.map((b) => b.total));
  const total = buckets.reduce((sum, b) => sum + b.total, 0);
  const heightOf = (value: number) => (max > 0 && value > 0 ? Math.max((value / max) * 100, 2) : 0);
  const activeBucket = active !== null ? buckets[active] : null;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 xl:col-span-2">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Ingresos — {option.title}</h2>
          <p className="text-[12.5px] text-muted">
            Tienda, mostrador y citas · <span className="font-semibold text-[#1d1d1f]">{money(total)}</span> en total
          </p>
        </div>
        <div role="group" aria-label="Agrupar ingresos por" className="flex rounded-full bg-black/5 p-0.5">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={granularity === o.value}
              onClick={() => {
                setGranularity(o.value);
                setActive(null);
              }}
              className={`h-7 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
                granularity === o.value ? "bg-white text-[#1d1d1f] shadow-sm" : "text-muted hover:text-[#1d1d1f]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {activeBucket && active !== null && (
          <div
            className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-[#1d1d1f] px-2.5 py-1.5 shadow-lg ${
              active === 0 ? "" : active === buckets.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{
              left: active === 0 ? 0 : active === buckets.length - 1 ? "100%" : `${((active + 0.5) / buckets.length) * 100}%`,
              // Encima de la barra, pero sin salirse del área de la gráfica:
              // en las barras más altas el tooltip queda sobre la propia barra.
              bottom: `calc(${(Math.min(heightOf(activeBucket.total), 70) / 100) * 12}rem + 2rem)`,
            }}
          >
            <p className="text-[13px] font-semibold text-white">{money(activeBucket.total)}</p>
            <p className="text-[11.5px] text-white/70">{activeBucket.detail}</p>
          </div>
        )}

        <div className="flex h-48 items-end gap-[2px] border-b border-black/10">
          {buckets.map((b, i) => (
            <button
              key={`${granularity}-${i}`}
              type="button"
              aria-label={`${b.detail}: ${money(b.total)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="flex h-full flex-1 items-end justify-center outline-none"
            >
              <motion.span
                className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${
                  active === i ? "bg-accent" : "bg-[#1d1d1f]/15"
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${heightOf(b.total)}%` }}
                transition={{ duration: 0.45, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
              />
            </button>
          ))}
        </div>

        <div className="mt-2 flex gap-[2px]" aria-hidden="true">
          {buckets.map((b, i) => (
            <span
              key={`${granularity}-label-${i}`}
              className={`flex-1 truncate text-center text-[11px] text-muted ${
                i % 2 === (buckets.length - 1) % 2 ? "" : "invisible sm:visible"
              }`}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {total === 0 && <p className="mt-4 text-center text-[12.5px] text-muted">Sin ingresos cobrados en este periodo.</p>}
    </div>
  );
}
