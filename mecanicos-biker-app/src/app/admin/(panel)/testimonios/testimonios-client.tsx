"use client";

import { useMemo, useState, useTransition } from "react";
import type { Testimonial, TestimonialStatus } from "@/lib/admin-data";
import { setTestimonialStatus, deleteTestimonial } from "@/lib/actions/testimonials";

const FILTERS: { value: TestimonialStatus | "todos"; label: string }[] = [
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobado", label: "Aprobados" },
  { value: "rechazado", label: "Rechazados" },
  { value: "todos", label: "Todos" },
];

const STATUS_STYLE: Record<TestimonialStatus, string> = {
  pendiente: "bg-amber-50 text-amber-700",
  aprobado: "bg-emerald-50 text-emerald-700",
  rechazado: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<TestimonialStatus, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" width="13" height="13" fill="currentColor" opacity={i < count ? 1 : 0.25}>
          <path d="M10 1l2.8 5.7 6.2.9-4.5 4.4 1 6.2L10 15l-5.5 3.2 1-6.2L1 7.6l6.2-.9z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimoniosClient({ initialTestimonials }: { initialTestimonials: Testimonial[] }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [filter, setFilter] = useState<TestimonialStatus | "todos">("pendiente");
  const [listError, setListError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () => testimonials.filter((t) => filter === "todos" || t.status === filter),
    [testimonials, filter],
  );

  function updateStatus(id: string, status: TestimonialStatus) {
    const previous = testimonials.find((t) => t.id === id)?.status;
    setListError(null);
    setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(async () => {
      try {
        await setTestimonialStatus(id, status);
      } catch {
        if (previous) setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, status: previous } : t)));
        setListError("No se pudo actualizar el testimonio. Intenta de nuevo.");
      }
    });
  }

  function remove(id: string) {
    const previous = testimonials;
    setListError(null);
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      try {
        await deleteTestimonial(id);
      } catch {
        setTestimonials(previous);
        setListError("No se pudo eliminar el testimonio. Intenta de nuevo.");
      }
    });
  }

  const pendingCount = testimonials.filter((t) => t.status === "pendiente").length;

  return (
    <div className="flex flex-col gap-5">
      {listError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{listError}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
              filter === f.value ? "bg-[#1d1d1f] text-white" : "bg-white text-muted hover:text-[#1d1d1f]"
            }`}
          >
            {f.label}
            {f.value === "pendiente" && pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((t) => (
          <div key={t.id} data-testid={`testimonial-row-${t.id}`} className="rounded-2xl border border-black/5 bg-white p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold text-[#1d1d1f]">
                  {t.name} {t.role && <span className="font-normal text-muted">· {t.role}</span>}
                </p>
                <p className="text-[12px] text-muted">{new Date(t.createdAt).toLocaleString("es-MX")}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS_STYLE[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
            <Stars count={t.stars} />
            <p className="mt-2 text-[14px] leading-relaxed text-[#1d1d1f]/85">&ldquo;{t.quote}&rdquo;</p>

            <div className="mt-4 flex gap-2">
              {t.status !== "aprobado" && (
                <button
                  onClick={() => updateStatus(t.id, "aprobado")}
                  disabled={isPending}
                  className="h-8 rounded-full bg-emerald-600 px-3.5 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Aprobar
                </button>
              )}
              {t.status !== "rechazado" && (
                <button
                  onClick={() => updateStatus(t.id, "rechazado")}
                  disabled={isPending}
                  className="h-8 rounded-full border border-black/10 px-3.5 text-[12.5px] font-semibold text-[#1d1d1f] hover:bg-black/5 disabled:opacity-60"
                >
                  Rechazar
                </button>
              )}
              <button
                onClick={() => remove(t.id)}
                disabled={isPending}
                className="h-8 rounded-full px-3.5 text-[12.5px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-muted">
            No hay testimonios en este filtro.
          </div>
        )}
      </div>

      <p className="text-[12.5px] text-muted">
        Solo los testimonios <strong>aprobados</strong> se muestran en el sitio público. Los nuevos llegan como
        pendientes hasta que los revises.
      </p>
    </div>
  );
}
