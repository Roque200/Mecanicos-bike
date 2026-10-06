import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "./Logo";
import { waLink } from "@/lib/whatsapp";

// Redes del taller. Un ícono solo se muestra cuando tiene su liga real:
// antes los tres apuntaban a "#" y no llevaban a ningún lado.
const SOCIAL: { label: string; url: string; icon: ReactNode }[] = [
  {
    label: "Facebook",
    url: "",
    icon: <path d="M15 8h2V5h-2a4 4 0 0 0-4 4v2H9v3h2v6h3v-6h2.2l.8-3H14V9a1 1 0 0 1 1-1z" />,
  },
  {
    label: "Instagram",
    url: "",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </>
    ),
  },
  {
    label: "TikTok",
    url: "",
    icon: <path d="M14 3v10.5a3.5 3.5 0 1 1-3-3.46M14 3c.4 2.2 2 3.8 4 4.2" strokeLinecap="round" strokeLinejoin="round" />,
  },
];
const socialLinks = SOCIAL.filter((s) => s.url);

export function Footer() {
  return (
    <footer className="bg-[#050505] pt-16 text-white/60">
      <div className="mx-auto max-w-6xl px-6 pb-10 sm:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <span className="text-[15px] font-semibold text-white">Mecánicos Bike</span>
            </Link>
            <p className="max-w-xs text-[13.5px] leading-relaxed">
              Taller especializado en mantenimiento y reparación de bicicletas de montaña.
            </p>
            <p className="mt-2 text-[13px] text-accent">Apaseo el Grande, Guanajuato</p>
            {socialLinks.length > 0 && (
              <div className="mt-4 flex gap-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/10 transition-colors hover:ring-accent hover:text-accent"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      {social.icon}
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-white/90">Taller</h3>
            <ul className="flex flex-col gap-2 text-[13.5px]">
              <li><Link href="/#servicios" className="hover:text-white">Servicios</Link></li>
              <li><Link href="/#proceso" className="hover:text-white">Proceso</Link></li>
              <li><Link href="/tienda" className="hover:text-white">Tienda</Link></li>
              <li><Link href="/paquetes" className="hover:text-white">Paquetes</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-white/90">Ayuda</h3>
            <ul className="flex flex-col gap-2 text-[13.5px]">
              <li><Link href="/#preguntas" className="hover:text-white">Preguntas frecuentes</Link></li>
              <li><Link href="/paquetes#contacto" className="hover:text-white">Agendar cita</Link></li>
              <li><Link href="/#preguntas" className="hover:text-white">Garantías</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-white/90">Contacto</h3>
            <ul className="flex flex-col gap-2 text-[13.5px]">
              <li>
                <a
                  href={waLink("Hola, quiero información sobre el taller.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
              <li className="text-white/50">Lun–Vie 9:00–19:00</li>
              <li className="text-white/50">Sáb 9:00–15:00</li>
            </ul>
          </div>
        </div>

        <p className="pt-6 text-center text-[12.5px]">© 2026 Mecánicos Bike. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
