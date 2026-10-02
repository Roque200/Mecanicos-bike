import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionValue } from "@/lib/admin-session";

// Corre en Node.js (default en Next 16) antes de que se genere CUALQUIER
// respuesta para /admin/**, incluida la carga de datos de los Server
// Components (citas, pedidos, clientes). Así una petición sin sesión válida
// nunca llega a ejecutar listCustomers()/listOrders()/etc — se corta aquí.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionValue(session)) {
    const redirect = NextResponse.redirect(new URL("/admin/login", request.url));
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }
  const response = NextResponse.next();
  // Sin esto, al cerrar sesión y dar "Atrás" en el navegador este podía
  // restaurar el panel desde su caché de atrás/adelante (bfcache) sin
  // volver a pasar por aquí — mostrando el Dashboard aunque la cookie de
  // sesión ya no exista. no-store evita que el navegador guarde esa copia.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
