import { listTestimonials } from "@/lib/db";
import { TestimoniosClient } from "./testimonios-client";

export const dynamic = "force-dynamic";

export default function AdminTestimoniosPage() {
  const testimonials = listTestimonials();
  return <TestimoniosClient initialTestimonials={testimonials} />;
}
