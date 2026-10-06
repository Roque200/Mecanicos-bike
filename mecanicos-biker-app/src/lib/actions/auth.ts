"use server";

import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  adminConfigured,
  checkAdminCredentials,
  createSessionCookieValue,
} from "@/lib/admin-session";
import { allowAction, RATE_LIMIT_ERROR } from "@/lib/rate-limit";

export async function loginAdmin(username: string, password: string) {
  if (!adminConfigured()) {
    return { ok: false as const, error: "El panel no está configurado. Revisa las variables ADMIN_* en Vercel." };
  }
  // Antes de comparar la contraseña: así un bot no puede probar miles por minuto.
  if (!(await allowAction("login"))) {
    return { ok: false as const, error: RATE_LIMIT_ERROR };
  }
  if (!checkAdminCredentials(String(username), String(password))) {
    return { ok: false as const, error: "Usuario o contraseña incorrectos." };
  }
  const session = createSessionCookieValue();
  if (!session) {
    return { ok: false as const, error: "El panel no está configurado. Revisa las variables ADMIN_* en Vercel." };
  }
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAgeSeconds,
  });
  return { ok: true as const };
}

export async function logoutAdmin() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}
