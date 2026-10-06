"use client";

import { useState, type FormEvent } from "react";
import { submitTestimonial } from "@/lib/actions/testimonials";
import { MAX_LENGTH } from "@/lib/validation";

export function TestimonialForm() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [stars, setStars] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await submitTestimonial({ name: name.trim(), role: role.trim(), quote: quote.trim(), stars });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <p className="text-[15px] font-semibold text-[#1d1d1f]">¡Gracias por tu testimonio!</p>
        <p className="mt-1.5 text-[13.5px] text-muted">
          Lo vamos a revisar y, en cuanto lo aprobemos, se mostrará en esta sección.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <h3 className="text-[15.5px] font-semibold text-[#1d1d1f]">Deja tu testimonio</h3>

      {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{error}</p>}

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            aria-label={`${n} estrellas`}
            className="text-accent"
          >
            <svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" opacity={n <= stars ? 1 : 0.25}>
              <path d="M10 1l2.8 5.7 6.2.9-4.5 4.4 1 6.2L10 15l-5.5 3.2 1-6.2L1 7.6l6.2-.9z" />
            </svg>
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
        Tu nombre
        <input
          required
          maxLength={MAX_LENGTH.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
        ¿Qué tipo de ciclista eres? (opcional)
        <input
          placeholder="Ej. Ciclista de ruta, enduro rider…"
          maxLength={MAX_LENGTH.testimonialRole}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
        Tu testimonio
        <textarea
          required
          rows={3}
          maxLength={MAX_LENGTH.testimonialQuote}
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          className="resize-none rounded-xl border border-black/10 px-3 py-2 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 flex h-11 items-center justify-center rounded-full bg-accent text-[14.5px] font-semibold text-white transition-transform enabled:hover:scale-[1.02] disabled:opacity-50"
      >
        {submitting ? "Enviando…" : "Enviar testimonio"}
      </button>
      <p className="text-center text-[12px] text-muted">Se revisa antes de publicarse.</p>
    </form>
  );
}
