import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

// Igual que la base de datos SQLite, los archivos subidos viven en data/
// (fuera del repo, gitignored) — no en public/, para no mezclar contenido
// que suben los usuarios con los archivos del proyecto.
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export class InvalidUploadError extends Error {}

export async function saveUploadedImage(file: File): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new InvalidUploadError("La imagen debe ser JPG, PNG o WEBP.");
  if (file.size > MAX_SIZE_BYTES) throw new InvalidUploadError("La imagen no puede pesar más de 5 MB.");

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return filename;
}

export async function deleteUploadedImage(filename: string | null) {
  if (!filename) return;
  try {
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    /* ya no existía — no pasa nada */
  }
}

export async function readUploadedImage(filename: string) {
  return fs.readFile(path.join(UPLOADS_DIR, filename));
}
