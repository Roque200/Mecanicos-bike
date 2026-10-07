import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { AboutUs } from "@/components/AboutUs";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";

// La portada se sirve ya generada desde la caché de Vercel (sin tocar la
// base en cada visita). Al aprobar o borrar un testimonio, el panel la
// regenera al instante con revalidatePath("/"); además se regenera sola
// cada 5 minutos como respaldo.
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <Hero />
      <TrustBar />
      <AboutUs />
      <Services />
      <Process />
      <Testimonials />
      <FAQ />
    </>
  );
}
