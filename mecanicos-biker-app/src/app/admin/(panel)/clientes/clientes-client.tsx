"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getRewardTier, type Customer, type RewardItem } from "@/lib/admin-data";
import {
  createRewardItem,
  updateRewardItem,
  deleteRewardItem,
  redeemReward,
} from "@/lib/actions/rewards";
import { formatPhone } from "@/lib/validation";

const TIER_STYLE: Record<string, string> = {
  Bronce: "bg-orange-50 text-orange-700",
  Plata: "bg-slate-100 text-slate-600",
  Oro: "bg-amber-50 text-amber-700",
  Diamante: "bg-sky-50 text-sky-700",
};

const EMPTY_REWARD_FORM = { name: "", pointsCost: "" };

export function ClientesClient({
  customers: initialCustomers,
  rewardItems: initialRewardItems,
}: {
  customers: Customer[];
  rewardItems: RewardItem[];
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [rewardItems, setRewardItems] = useState(initialRewardItems);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardForm, setRewardForm] = useState(EMPTY_REWARD_FORM);
  const [rewardError, setRewardError] = useState<string | null>(null);

  const [redeemCustomerId, setRedeemCustomerId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      customers
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || (query.replace(/\D/g, "") !== "" && c.phone.replace(/\D/g, "").includes(query.replace(/\D/g, ""))))
        .sort((a, b) => b.totalSpent - a.totalSpent),
    [customers, query],
  );

  const redeemCustomer = customers.find((c) => c.id === redeemCustomerId) ?? null;
  const activeRewardItems = rewardItems.filter((r) => r.active);

  // ---------- Catálogo de premios ----------

  function openCreateReward() {
    setEditingRewardId(null);
    setRewardForm(EMPTY_REWARD_FORM);
    setRewardModalOpen(true);
  }

  function openEditReward(item: RewardItem) {
    setEditingRewardId(item.id);
    setRewardForm({ name: item.name, pointsCost: String(item.pointsCost) });
    setRewardModalOpen(true);
  }

  function handleRewardSubmit(e: FormEvent) {
    e.preventDefault();
    const name = rewardForm.name.trim();
    const pointsCost = Number(rewardForm.pointsCost) || 0;
    if (!name || pointsCost <= 0) return;
    setRewardError(null);

    if (editingRewardId) {
      const id = editingRewardId;
      const previous = rewardItems.find((r) => r.id === id);
      const active = previous?.active ?? true;
      setRewardItems((prev) => prev.map((r) => (r.id === id ? { ...r, name, pointsCost } : r)));
      setRewardModalOpen(false);
      startTransition(async () => {
        try {
          await updateRewardItem(id, { name, pointsCost, active });
        } catch {
          if (previous) setRewardItems((prev) => prev.map((r) => (r.id === id ? previous : r)));
          setRewardError("No se pudo guardar el premio. Intenta de nuevo.");
        }
      });
    } else {
      const tempId = `tmp-${Date.now()}`;
      setRewardItems((prev) => [...prev, { id: tempId, name, pointsCost, active: true }]);
      setRewardModalOpen(false);
      startTransition(async () => {
        try {
          const created = await createRewardItem({ name, pointsCost });
          setRewardItems((prev) => prev.map((r) => (r.id === tempId ? created : r)));
        } catch {
          setRewardItems((prev) => prev.filter((r) => r.id !== tempId));
          setRewardError("No se pudo crear el premio. Intenta de nuevo.");
        }
      });
    }
  }

  function toggleRewardActive(item: RewardItem) {
    setRewardError(null);
    setRewardItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, active: !r.active } : r)));
    startTransition(async () => {
      try {
        await updateRewardItem(item.id, { name: item.name, pointsCost: item.pointsCost, active: !item.active });
      } catch {
        setRewardItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, active: item.active } : r)));
        setRewardError("No se pudo actualizar el premio. Intenta de nuevo.");
      }
    });
  }

  function removeRewardItem(id: string) {
    const previous = rewardItems;
    setRewardError(null);
    setRewardItems((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      try {
        await deleteRewardItem(id);
      } catch {
        setRewardItems(previous);
        setRewardError("No se pudo eliminar el premio. Intenta de nuevo.");
      }
    });
  }

  // ---------- Canje ----------

  function openRedeem(customerId: string) {
    setRedeemError(null);
    setRedeemCustomerId(customerId);
  }

  function handleRedeemConfirm(item: RewardItem) {
    if (!redeemCustomer) return;
    if (redeemCustomer.rewardPoints < item.pointsCost) return;
    const customerId = redeemCustomer.id;
    const previous = redeemCustomer;
    setRedeemError(null);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              rewardPoints: c.rewardPoints - item.pointsCost,
              rewardsRedeemed: c.rewardsRedeemed + 1,
              lastReward: item.name,
            }
          : c,
      ),
    );
    setRedeemCustomerId(null);
    startTransition(async () => {
      const result = await redeemReward(customerId, item.id);
      if (!result.ok) {
        // El descuento de puntos ya se había mostrado como hecho — hay que
        // regresarlo, porque el servidor nunca lo aplicó (ej. alguien más
        // canjeó justo antes y ya no le alcanzaba). Se reabre el modal para
        // que el admin vea por qué.
        setCustomers((prev) => prev.map((c) => (c.id === customerId ? previous : c)));
        setRedeemError(result.error);
        setRedeemCustomerId(customerId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="h-9 w-full max-w-xs rounded-full border border-black/10 bg-white px-4 text-[13.5px] outline-none focus:border-accent"
        />
        <p className="text-[12.5px] text-muted">Puntos según el servicio completado · canjeables por los premios del catálogo</p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-5">
        {rewardError && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{rewardError}</p>
        )}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Catálogo de premios</h2>
          <button
            onClick={openCreateReward}
            className="flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Nuevo premio
          </button>
        </div>
        <div className="flex flex-col divide-y divide-black/5">
          {rewardItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleRewardActive(item)}
                  aria-label={item.active ? "Desactivar premio" : "Activar premio"}
                  className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors ${item.active ? "bg-accent" : "bg-black/10"}`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition-transform ${item.active ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
                <div>
                  <p className={`text-[13.5px] font-medium ${item.active ? "text-[#1d1d1f]" : "text-muted line-through"}`}>
                    {item.name}
                  </p>
                  <p className="text-[12px] text-muted">{item.pointsCost} puntos</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEditReward(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-[#1d1d1f]"
                  aria-label={`Editar ${item.name}`}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => removeRewardItem(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                  aria-label={`Eliminar ${item.name}`}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {rewardItems.length === 0 && <p className="py-4 text-center text-[13px] text-muted">Aún no hay premios en el catálogo.</p>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[900px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-black/5 text-[12px] uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Cliente</th>
              <th className="px-5 py-3 font-semibold">Contacto</th>
              <th className="px-5 py-3 font-semibold">Visitas</th>
              <th className="px-5 py-3 font-semibold">Total gastado</th>
              <th className="px-5 py-3 font-semibold">Nivel</th>
              <th className="px-5 py-3 font-semibold">Puntos</th>
              <th className="px-5 py-3 font-semibold">Último premio</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {visible.map((c) => {
              const tier = getRewardTier(c.rewardLifetime);
              const canRedeem = activeRewardItems.some((r) => r.pointsCost <= c.rewardPoints);
              return (
                <tr key={c.id} className="transition-colors hover:bg-surface/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[12px] font-semibold text-white">
                        {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                      <span className="font-medium text-[#1d1d1f]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#1d1d1f]/70">
                    <p className="whitespace-nowrap">{formatPhone(c.phone)}</p>
                    {c.email && <p className="text-[12px] text-muted">{c.email}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-[#1d1d1f]/70">{c.visits}</td>
                  <td className="px-5 py-3.5 font-medium text-[#1d1d1f]">
                    ${c.totalSpent.toLocaleString("es-MX")} MXN
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${TIER_STYLE[tier.label]}`}>
                      {tier.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-[#1d1d1f]">{c.rewardPoints}</td>
                  <td className="px-5 py-3.5 text-[#1d1d1f]/70">
                    {c.lastReward ?? <span className="text-muted">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openRedeem(c.id)}
                      disabled={!canRedeem}
                      className="rounded-full bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-muted"
                    >
                      Canjear
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted">
                  No se encontraron clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: alta/edición de premio */}
      <AnimatePresence>
        {rewardModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRewardModalOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 1, scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6"
            >
              <h2 className="mb-5 text-lg font-semibold text-[#1d1d1f]">
                {editingRewardId ? "Editar premio" : "Nuevo premio"}
              </h2>
              <form onSubmit={handleRewardSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Nombre del premio
                  <input
                    required
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                    placeholder="Ej. Afinación general gratis"
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Costo en puntos
                  <input
                    required
                    type="number"
                    min="1"
                    value={rewardForm.pointsCost}
                    onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: e.target.value })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRewardModalOpen(false)}
                    className="h-10 flex-1 rounded-full border border-black/10 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="h-10 flex-1 rounded-full bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-dark"
                  >
                    {editingRewardId ? "Guardar cambios" : "Agregar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal: elegir premio a canjear para un cliente */}
      <AnimatePresence>
        {redeemCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRedeemCustomerId(null)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 1, scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6"
            >
              <h2 className="text-lg font-semibold text-[#1d1d1f]">Canjear premio</h2>
              <p className="mb-4 text-[13px] text-muted">
                {redeemCustomer.name} tiene <span className="font-semibold text-[#1d1d1f]">{redeemCustomer.rewardPoints} puntos</span>
              </p>
              {redeemError && <p className="mb-3 text-[12.5px] text-red-600">{redeemError}</p>}
              <div className="flex flex-col gap-2">
                {activeRewardItems.map((item) => {
                  const affordable = redeemCustomer.rewardPoints >= item.pointsCost;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleRedeemConfirm(item)}
                      disabled={!affordable}
                      className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-3 text-left transition-colors hover:border-accent hover:bg-surface/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-[13.5px] font-medium text-[#1d1d1f]">{item.name}</span>
                      <span className="text-[12px] font-semibold text-muted">{item.pointsCost} pts</span>
                    </button>
                  );
                })}
                {activeRewardItems.length === 0 && (
                  <p className="py-2 text-center text-[13px] text-muted">No hay premios activos en el catálogo.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRedeemCustomerId(null)}
                className="mt-4 h-10 w-full rounded-full border border-black/10 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
              >
                Cerrar
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
