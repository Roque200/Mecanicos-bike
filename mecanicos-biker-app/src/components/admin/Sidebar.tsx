"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { logoutAdmin } from "@/lib/actions/auth";

const NAV = [
  {
    href: "/admin/dashboard",
    label: "Resumen",
    icon: (
      <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    ),
  },
  {
    href: "/admin/citas",
    label: "Citas",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: (
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6M9.5 20a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8zM17 20a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/admin/productos",
    label: "Productos",
    icon: (
      <>
        <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3.2 3.2 0 0 1 0 6.4M21 20c0-2.8-2-5.1-4.6-5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/escanear",
    label: "Escanear",
    icon: (
      <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/horarios",
    label: "Horarios",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/ventas",
    label: "Venta de mostrador",
    icon: (
      <>
        <path d="M3 7h18l-1.5 9.5a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/admin/testimonios",
    label: "Testimonios",
    icon: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.5 9 9 0 0 1-3.6-.7L3 21l1.7-5.1A8.4 8.4 0 1 1 21 11.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </>
    ),
  },
  {
    href: "/admin/segunda-mano",
    label: "Segunda mano",
    icon: (
      <>
        <path d="M4 7l8-4 8 4-8 4-8-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M4 7v10l8 4 8-4V7M12 11v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </>
    ),
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logoutAdmin();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col bg-[#0b0b0c] text-white">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <LogoMark className="h-8 w-8" />
        <div>
          <p className="text-[13.5px] font-semibold leading-tight">Mecánicos Biker</p>
          <p className="text-[11px] leading-tight text-white/40">Panel administrativo</p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                    active ? "bg-accent text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className="shrink-0">
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ver sitio público
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
