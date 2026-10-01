import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { AboutUs } from "@/components/AboutUs";
import { Services } from "@/components/Services";
import { Process } from "@/components/Process";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";

// La portada muestra testimonios aprobados, que cambian en vivo desde el
// panel — sin esto, Next la generaría como página estática congelada con
// lo que hubiera en la base de datos al compilar.
export const dynamic = "force-dynamic";

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
