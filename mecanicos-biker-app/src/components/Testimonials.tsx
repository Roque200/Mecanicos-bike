import { SectionHeader } from "./SectionHeader";
import { TestimonialsGrid } from "./TestimonialsGrid";
import { TestimonialForm } from "./TestimonialForm";
import { listApprovedTestimonials } from "@/lib/db";

export function Testimonials() {
  const testimonials = listApprovedTestimonials();

  return (
    <section className="bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader eyebrow="Testimonios" title="Lo que dicen nuestros clientes" />
        <TestimonialsGrid testimonials={testimonials} />
        <TestimonialForm />
      </div>
    </section>
  );
}
