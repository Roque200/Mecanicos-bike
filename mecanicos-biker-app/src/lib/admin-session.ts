// Verificación de sesión de administrador — funciones puras (sin next/headers,
// sin NextRequest) para que las pueda usar tanto proxy.ts (Node runtime) como
// los server actions. La contraseña NUNCA se manda al navegador: solo vive
// aquí, en el servidor, comparada con crypto.timingSafeEqual para no filtrar
// su longitud/contenido por temporización.
import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "mb_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 horas

// En Vercel (producción y previews) las credenciales y la llave de sesión
// SIEMPRE salen de las variables de entorno: si falta alguna, el panel queda
// cerrado. Antes se usaban admin / biker2026 y una llave escrita aquí, así
// que con una variable olvidada cualquiera podía entrar o fabricar su propia
// sesión. Los valores de demo solo existen en local y en las pruebas.
const ON_VERCEL = Boolean(process.env.VERCEL);

const DEV_FALLBACK = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "biker2026",
  ADMIN_SESSION_SECRET: "dev-only-insecure-secret-change-me",
} as const;

function readEnv(name: keyof typeof DEV_FALLBACK): string | null {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (ON_VERCEL) {
    console.error(`Falta la variable ${name}: el panel administrativo queda cerrado hasta que se configure.`);
    return null;
  }
  return DEV_FALLBACK[name];
}

/** false si en Vercel falta alguna de las variables del panel. */
export function adminConfigured() {
  return Boolean(readEnv("ADMIN_USERNAME") && readEnv("ADMIN_PASSWORD") && readEnv("ADMIN_SESSION_SECRET"));
}

function sign(payload: string): string | null {
  const secret = readEnv("ADMIN_SESSION_SECRET");
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Igual comparamos algo del mismo tamaño que "a" para no filtrar la
    // longitud de "b" a través del tiempo que tarda en responder.
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function checkAdminCredentials(username: string, password: string) {
  const expectedUser = readEnv("ADMIN_USERNAME");
  const expectedPass = readEnv("ADMIN_PASSWORD");
  if (!expectedUser || !expectedPass) return false;
  const userOk = timingSafeEqual(username.trim().toLowerCase(), expectedUser.toLowerCase());
  const passOk = timingSafeEqual(password, expectedPass);
  return userOk && passOk;
}

/** Cookie firmada: "admin.<expira_ms>.<firma>" — no hay estado en el servidor que limpiar. */
export function createSessionCookieValue(): { value: string; maxAgeSeconds: number } | null {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = sign(payload);
  if (!signature) return null;
  return { value: `${payload}.${signature}`, maxAgeSeconds: SESSION_MAX_AGE_SECONDS };
}

export function isValidSessionValue(value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [kind, expiresAtRaw, signature] = parts;
  if (kind !== "admin") return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expectedSignature = sign(`${kind}.${expiresAtRaw}`);
  if (!expectedSignature) return false;
  return timingSafeEqual(signature, expectedSignature);
}
