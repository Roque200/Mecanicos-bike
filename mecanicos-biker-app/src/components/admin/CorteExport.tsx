"use client";

import { useState } from "react";
import { exportCashCut } from "@/lib/actions/reports";
import { businessNow } from "@/lib/booking";

export function CorteExport() {
  const [from, setFrom] = useState(() => `${businessNow().dateKey.slice(0, 8)}01`);
  const [to, setTo] = useState(() => businessNow().dateKey);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setPending(true);
    setError(null);
    const res = await exportCashCut(from, to);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Exportar corte</h2>
        <p className="text-[12.5px] text-muted">Descarga un CSV con las ventas del rango elegido, desglosadas por método de pago.</p>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border border-black/10 px-3 text-[13.5px] text-[#1d1d1f] outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-muted">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border border-black/10 px-3 text-[13.5px] text-[#1d1d1f] outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={handleExport}
          disabled={pending}
          className="h-10 rounded-full bg-accent px-5 text-[13.5px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] disabled:opacity-60"
        >
          {pending ? "Generando…" : "Exportar CSV"}
        </button>
      </div>
    </div>
  );
}
