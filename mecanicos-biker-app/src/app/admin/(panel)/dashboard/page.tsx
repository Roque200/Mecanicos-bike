import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { CorteExport } from "@/components/admin/CorteExport";
import { AppointmentStatusBadge, OrderStatusBadge } from "@/components/admin/StatusBadge";
import { APPOINTMENT_STATUS_LABEL, ORDER_STATUS_LABEL, orderTotal } from "@/lib/admin-data";
import { getDashboardStats } from "@/lib/db";
import { businessNow } from "@/lib/booking";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const today = businessNow().dateKey;
  const { todayAppointments, pendingOrders, lowStock, monthRevenue, revenueTrend, recentOrders, upcoming } =
    await getDashboardStats(today);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Citas de hoy"
          value={String(todayAppointments)}
          icon={<path d="M3 10h18M8 3v4M16 3v4M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        />
        <StatCard
          label="Ingresos (14 días)"
          value={`$${monthRevenue.toLocaleString("es-MX")}`}
          icon={<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        />
        <StatCard
          label="Pedidos pendientes"
          value={String(pendingOrders)}
          icon={<path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        />
        <StatCard
          label="Productos con bajo stock"
          value={String(lowStock.length)}
          trend={lowStock.length > 0 ? { value: "revisar", positive: false } : undefined}
          icon={<path d="M12 9v4M12 17h.01M10.3 3.9L2.7 17.1a1.8 1.8 0 0 0 1.6 2.7h15.4a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Ingresos — últimos 14 días</h2>
            <span className="text-[12.5px] text-muted">Tienda, mostrador y citas</span>
          </div>
          <RevenueChart data={revenueTrend} />
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Bajo stock</h2>
            <Link href="/admin/productos" className="text-[12.5px] font-semibold text-accent hover:underline">
              Ver todo
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {lowStock.length === 0 && <p className="text-[13px] text-muted">Todo el inventario está en buen nivel.</p>}
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-[13.5px] text-[#1d1d1f]">{p.name}</span>
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-semibold text-red-600">
                  {p.stock} pzas
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Próximas citas</h2>
            <Link href="/admin/citas" className="text-[12.5px] font-semibold text-accent hover:underline">
              Ver todas
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-black/5">
            {upcoming.length === 0 && <p className="text-[13px] text-muted">No hay citas próximas.</p>}
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-[#1d1d1f]">{a.customer}</p>
                  <p className="text-[12.5px] text-muted">
                    {a.service} · {a.date} {a.hour}
                  </p>
                </div>
                <AppointmentStatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status]} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-[12.5px] font-semibold text-accent hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-black/5">
            {recentOrders.length === 0 && <p className="text-[13px] text-muted">Aún no hay pedidos.</p>}
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-[#1d1d1f]">{o.customer}</p>
                  <p className="text-[12.5px] text-muted">
                    {o.id} · ${orderTotal(o).toLocaleString("es-MX")} MXN
                  </p>
                </div>
                <OrderStatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <CorteExport />
    </div>
  );
}
