import { listTestimonials } from "@/lib/db";
import { TestimoniosClient } from "./testimonios-client";

export const dynamic = "force-dynamic";

export default async function AdminTestimoniosPage() {
  const testimonials = await listTestimonials();
  return <TestimoniosClient initialTestimonials={testimonials} />;
}
