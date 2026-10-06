import { headers } from "next/headers";
import { hitRateLimit } from "@/lib/db";

// Límites por IP de las acciones públicas: sin ellos cualquiera podía
// adivinar la contraseña del panel a fuerza de intentos, llenar todos los
// horarios con citas falsas o apartar todo el inventario con pedidos que
// nunca se pagan. Están pensados para que un cliente real nunca los alcance.
export const LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  booking: { limit: 5, windowSeconds: 60 * 60 },
  order: { limit: 6, windowSeconds: 60 * 60 },
  testimonial: { limit: 3, windowSeconds: 60 * 60 },
} as const;

export const RATE_LIMIT_ERROR = "Demasiados intentos. Espera un momento y vuelve a intentarlo.";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

async function clientIp(): Promise<string | null> {
  const h = await headers();
  // En Vercel ambos encabezados los pone (y sobrescribe) la plataforma con la
  // IP real del visitante, así que no se pueden falsificar desde fuera.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
}

/** true si la IP actual todavía puede hacer `action`; cuenta el intento. */
export async function allowAction(action: keyof typeof LIMITS): Promise<boolean> {
  const ip = await clientIp();
  // Sin proxy delante (servidor local / pruebas) no hay IP de cliente real.
  if (!ip || LOOPBACK.has(ip)) return true;
  const { limit, windowSeconds } = LIMITS[action];
  return hitRateLimit(`${action}:${ip}`, limit, windowSeconds);
}
