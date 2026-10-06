import type { Metadata } from "next";
import { Pricing } from "@/components/Pricing";
import { Booking } from "@/components/Booking";

export const metadata: Metadata = {
  title: "Paquetes y citas",
  description: "Paquetes de servicio para tu bici de montaña con precios claros. Agenda tu cita en línea y confírmala por WhatsApp.",
  openGraph: { title: "Paquetes y citas · Mecánicos Bike", description: "Paquetes de servicio para tu bici de montaña con precios claros. Agenda tu cita en línea y confírmala por WhatsApp." },
};

export default function PaquetesPage() {
  return (
    <>
      <Pricing />
      <Booking />
    </>
  );
}
