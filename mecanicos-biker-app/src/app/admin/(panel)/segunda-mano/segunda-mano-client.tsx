"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SecondHandItem } from "@/lib/admin-data";
import { SecondHandPhoto } from "@/components/SecondHandPhoto";
import { createSecondHandItem, updateSecondHandItem, deleteSecondHandItem, setSecondHandStatus } from "@/lib/actions/secondhand";

const EMPTY_FORM = { name: "", description: "", price: "", condition: "" };

// Vercel rechaza cualquier petición de más de 4.5 MB, y una foto del celular
// suele pasar de eso. Se reduce aquí, antes de subirla: 1600 px por lado en
// JPEG quedan en unos cientos de KB y se ven bien en la tienda.
const MAX_IMAGE_SIDE = 1600;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function SegundaManoClient({ initialItems }: { initialItems: SecondHandItem[] }) {
  const [items, setItems] = useState<SecondHandItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImagePath, setEditingImagePath] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditingId(null);
    setEditingImagePath(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(item: SecondHandItem) {
    setEditingId(item.id);
    setEditingImagePath(item.imagePath);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      condition: item.condition,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function attachImage(formData: FormData, original: File | undefined) {
    if (!original) return true;
    const file = await shrinkImage(original);
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormError("La foto es demasiado pesada. Prueba con otra o tómala con menor resolución.");
      return false;
    }
    formData.set("image", file);
    return true;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) {
      e.currentTarget.reportValidity();
      return;
    }
    setFormError(null);

    const formData = new FormData();
    formData.set("name", form.name.trim());
    formData.set("description", form.description.trim());
    formData.set("price", form.price);
    formData.set("condition", form.condition.trim());
    const original = fileInputRef.current?.files?.[0];

    if (editingId) {
      const id = editingId;
      startTransition(async () => {
        if (!(await attachImage(formData, original))) return;
        const res = await updateSecondHandItem(id, editingImagePath, formData);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  name: form.name.trim(),
                  description: form.description.trim(),
                  price: Math.round(Number(form.price)) || 0,
                  condition: form.condition.trim(),
                  imagePath: res.imagePath,
                }
              : it,
          ),
        );
        setModalOpen(false);
      });
    } else {
      startTransition(async () => {
        if (!(await attachImage(formData, original))) return;
        const res = await createSecondHandItem(formData);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        setItems((prev) => [res.item, ...prev]);
        setModalOpen(false);
      });
    }
  }

  function toggleStatus(item: SecondHandItem) {
    const next = item.status === "disponible" ? "vendido" : "disponible";
    setListError(null);
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: next } : it)));
    startTransition(async () => {
      try {
        await setSecondHandStatus(item.id, next);
      } catch {
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: item.status } : it)));
        setListError("No se pudo actualizar el artículo. Intenta de nuevo.");
      }
    });
  }

  function remove(id: string) {
    const previous = items;
    setListError(null);
    setItems((prev) => prev.filter((it) => it.id !== id));
    startTransition(async () => {
      try {
        await deleteSecondHandItem(id);
      } catch {
        setItems(previous);
        setListError("No se pudo eliminar el artículo. Intenta de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {listError && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{listError}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] text-muted">{items.length} artículos de segunda mano</p>
        <button
          onClick={openCreate}
          className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nuevo artículo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white">
            <div className="flex h-36 items-center justify-center bg-surface">
              <SecondHandPhoto key={item.imagePath} imagePath={item.imagePath} alt={item.name} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[14.5px] font-semibold text-[#1d1d1f]">{item.name}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    item.status === "disponible" ? "bg-emerald-50 text-emerald-700" : "bg-black/5 text-muted"
                  }`}
                >
                  {item.status === "disponible" ? "Disponible" : "Vendido"}
                </span>
              </div>
              <p className="text-[13px] text-muted">{item.condition}</p>
              <p className="line-clamp-2 text-[12.5px] text-[#1d1d1f]/70">{item.description}</p>
              <p className="mt-1 text-[16px] font-semibold text-[#1d1d1f]">${item.price.toLocaleString("es-MX")}</p>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="h-8 flex-1 rounded-full border border-black/10 text-[12.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                >
                  Editar
                </button>
                <button
                  onClick={() => toggleStatus(item)}
                  className="h-8 flex-1 rounded-full border border-black/10 text-[12.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                >
                  {item.status === "disponible" ? "Marcar vendido" : "Reactivar"}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  aria-label={`Eliminar ${item.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="col-span-full rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-muted">
            Aún no has publicado ningún artículo de segunda mano.
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 1, scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6"
            >
              <h2 className="mb-5 text-lg font-semibold text-[#1d1d1f]">
                {editingId ? "Editar artículo" : "Nuevo artículo de segunda mano"}
              </h2>
              {formError && (
                <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-600">{formError}</p>
              )}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Nombre de la pieza
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Descripción
                  <textarea
                    required
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="resize-none rounded-xl border border-black/10 px-3 py-2 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Estado de la pieza
                  <input
                    required
                    placeholder="Ej. Usado, buen estado"
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Precio (MXN)
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="h-10 rounded-xl border border-black/10 px-3 text-[14px] text-[#1d1d1f] outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                  Foto {editingId && editingImagePath ? "(deja vacío para conservar la actual)" : ""}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="text-[13px] text-[#1d1d1f]"
                  />
                </label>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="h-10 flex-1 rounded-full border border-black/10 text-[13.5px] font-semibold text-[#1d1d1f] hover:bg-black/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-10 flex-1 rounded-full bg-accent text-[13.5px] font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
                  >
                    {editingId ? "Guardar cambios" : "Publicar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
