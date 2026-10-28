"use client";

import { useRef } from "react";
import { UploadedPhoto } from "@/components/UploadedPhoto";
import { MAX_PRODUCT_PHOTOS } from "@/lib/product-photos";

/** Una foto del formulario: ya guardada en el producto, o recién elegida (aún sin subir). */
export type FormPhoto =
  | { key: string; kind: "existing"; path: string }
  | { key: string; kind: "new"; file: File; url: string };

let nextKey = 0;

export function existingPhotos(paths: string[]): FormPhoto[] {
  return paths.map((path) => ({ key: `e-${path}`, kind: "existing", path }));
}

/** Libera las vistas previas de las fotos nuevas (URL.createObjectURL). */
export function releasePhotos(photos: FormPhoto[]) {
  for (const photo of photos) if (photo.kind === "new") URL.revokeObjectURL(photo.url);
}

const SMALL_BUTTON =
  "flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#1d1d1f] shadow-sm ring-1 ring-black/10 hover:bg-white disabled:opacity-30";

/**
 * Fotos del producto en el formulario del panel: agregar (varias a la vez),
 * cambiar el orden con las flechas y quitar. La primera es la portada.
 */
export function PhotoManager({ photos, onChange }: { photos: FormPhoto[]; onChange: (photos: FormPhoto[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const room = MAX_PRODUCT_PHOTOS - photos.length;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const added: FormPhoto[] = Array.from(files)
      .slice(0, room)
      .map((file) => ({ key: `n-${nextKey++}`, kind: "new", file, url: URL.createObjectURL(file) }));
    onChange([...photos, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, delta: number) {
    const next = [...photos];
    const [photo] = next.splice(index, 1);
    next.splice(index + delta, 0, photo);
    onChange(next);
  }

  function remove(index: number) {
    releasePhotos([photos[index]]);
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
      <span>
        Fotos ({photos.length}/{MAX_PRODUCT_PHOTOS}) <span className="font-normal">· la primera es la portada</span>
      </span>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.key}
            className="relative aspect-square overflow-hidden rounded-xl border border-black/10 bg-surface"
          >
            {photo.kind === "existing" ? (
              <UploadedPhoto imagePath={photo.path} alt={`Foto ${i + 1}`} className="h-full w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt={`Foto ${i + 1}`} className="h-full w-full object-contain" />
            )}
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                Portada
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Quitar foto ${i + 1}`}
              className={`absolute right-1 top-1 ${SMALL_BUTTON}`}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
            {photos.length > 1 && (
              <div className="absolute inset-x-1 bottom-1 flex justify-between">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Mover foto ${i + 1} a la izquierda`}
                  className={SMALL_BUTTON}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1}
                  aria-label={`Mover foto ${i + 1} a la derecha`}
                  className={SMALL_BUTTON}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
        {room > 0 && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-[12px] text-muted hover:border-accent hover:text-accent">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Subir foto
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => addFiles(e.target.files)}
              className="sr-only"
            />
          </label>
        )}
      </div>
    </div>
  );
}
