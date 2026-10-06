import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen, primaryButtonClass, secondaryButtonClass } from "@/components/StatusScreen";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      fullScreen
      eyebrow="Error 404"
      title="No encontramos esta página"
      message="Puede que el enlace esté incompleto o que la página ya no exista. Si llegaste desde el enlace de una cita o un pedido, revisa que lo hayas copiado completo."
    >
      <Link href="/" className={primaryButtonClass}>
        Ir al inicio
      </Link>
      <Link href="/paquetes#contacto" className={secondaryButtonClass}>
        Agendar una cita
      </Link>
    </StatusScreen>
  );
}
