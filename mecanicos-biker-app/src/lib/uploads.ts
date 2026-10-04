import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Las fotos de segunda mano viven en Supabase Storage (bucket público
// "segunda-mano"). El disco de Vercel es de solo lectura y además se borra
// en cada reinicio: escribir ahí hacía que la publicación tronara y la foto
// nunca se guardara. Sin SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (en local
// y en las pruebas) se usa data/uploads como antes.
const BUCKET = "segunda-mano";
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export class InvalidUploadError extends Error {}

type StorageConfig = { url: string; key: string };

function storageConfig(): StorageConfig | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url && key) return { url, key };
  if (process.env.VERCEL) {
    throw new InvalidUploadError(
      "Falta configurar el almacenamiento de fotos (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel).",
    );
  }
  return null;
}

function authHeaders({ key }: StorageConfig): Record<string, string> {
  // Las llaves nuevas (sb_secret_…) solo van en "apikey"; las heredadas
  // (service_role, un JWT que empieza con "eyJ") también como Bearer.
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

function objectUrl(config: StorageConfig, filename: string) {
  return `${config.url}/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`;
}

export async function saveUploadedImage(file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new InvalidUploadError("La imagen debe ser JPG, PNG o WEBP.");
  if (file.size > MAX_SIZE_BYTES) throw new InvalidUploadError("La imagen no puede pesar más de 5 MB.");

  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const config = storageConfig();

  if (!config) {
    await fs.mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(LOCAL_UPLOADS_DIR, filename), buffer);
    return filename;
  }

  const res = await fetch(objectUrl(config, filename), {
    method: "POST",
    headers: {
      ...authHeaders(config),
      "Content-Type": file.type,
      "Cache-Control": "max-age=31536000",
      "x-upsert": "false",
    },
    body: buffer,
  });
  if (!res.ok) {
    console.error(`Supabase Storage rechazó la foto (${res.status}):`, await res.text().catch(() => ""));
    throw new InvalidUploadError("No se pudo subir la foto. Intenta de nuevo en unos segundos.");
  }
  return filename;
}

export async function deleteUploadedImage(filename: string | null) {
  if (!filename) return;
  try {
    const config = storageConfig();
    if (!config) {
      await fs.unlink(path.join(LOCAL_UPLOADS_DIR, filename));
      return;
    }
    await fetch(objectUrl(config, filename), { method: "DELETE", headers: authHeaders(config) });
  } catch {
    /* ya no existía o no se pudo borrar — el artículo se actualiza igual */
  }
}

/** URL pública de la foto en Supabase Storage, o null si se guardan en disco (local). */
export function publicImageUrl(filename: string): string | null {
  const config = storageConfig();
  if (!config) return null;
  return `${config.url}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;
}

export async function readUploadedImage(filename: string) {
  return fs.readFile(path.join(LOCAL_UPLOADS_DIR, filename));
}
