"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, { title: string; desc: string }> = {
  "/admin/dashboard": { title: "Resumen", desc: "Vista general del taller y la tienda" },
  "/admin/citas": { title: "Citas", desc: "Agenda y estado de las citas del taller" },
  "/admin/pedidos": { title: "Pedidos", desc: "Pedidos de productos realizados por WhatsApp" },
  "/admin/productos": { title: "Productos", desc: "Catálogo e inventario de la tienda" },
  "/admin/clientes": { title: "Clientes", desc: "Historial y contacto de tus clientes" },
  "/admin/escanear": { title: "Escanear", desc: "Escanea el código QR de una cita para registrar la llegada" },
  "/admin/horarios": { title: "Horarios", desc: "Días y horas disponibles para agendar citas" },
  "/admin/ventas": { title: "Venta de mostrador", desc: "Registra ventas y trabajos hechos en el taller" },
  "/admin/testimonios": { title: "Testimonios", desc: "Aprueba los testimonios antes de publicarlos" },
  "/admin/segunda-mano": { title: "Segunda mano", desc: "Piezas usadas en consignación de tus clientes" },
};

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const meta = TITLES[pathname] ?? { title: "Panel", desc: "" };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/5 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] hover:bg-black/5 lg:hidden"
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f]">{meta.title}</h1>
          {meta.desc && <p className="hidden text-[12.5px] text-muted sm:block">{meta.desc}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-[13px] text-muted sm:block">Apaseo el Grande, Gto.</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d1d1f] text-[13px] font-semibold text-white">
          MB
        </span>
      </div>
    </header>
  );
}
