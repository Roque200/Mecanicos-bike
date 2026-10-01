import { SectionHeader } from "./SectionHeader";
import { TestimonialsCarousel } from "./TestimonialsCarousel";
import { TestimonialForm } from "./TestimonialForm";
import { listApprovedTestimonials } from "@/lib/db";

export function Testimonials() {
  const testimonials = listApprovedTestimonials();

  return (
    <section className="bg-surface py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <SectionHeader eyebrow="Testimonios" title="Lo que dicen nuestros clientes" />
        <div className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden rounded-3xl bg-white lg:grid-cols-2">
          <div className="border-b border-black/5 p-7 sm:p-9 lg:border-b-0 lg:border-r">
            <TestimonialForm />
          </div>
          <div className="flex p-7 sm:p-9">
            <TestimonialsCarousel testimonials={testimonials} />
          </div>
        </div>
      </div>
    </section>
  );
}
