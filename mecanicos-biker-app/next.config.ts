import type { NextConfig } from "next";

// Encabezados de seguridad para todas las páginas.
// - frame-ancestors / X-Frame-Options: nadie puede meter el sitio (ni el
//   panel) dentro de un iframe para engañar con clics (clickjacking).
// - img-src: las fotos de segunda mano vienen de Supabase Storage y el QR de
//   las citas es una imagen data: generada en el servidor.
// - vercel.live: la barra de comentarios que Vercel inyecta en los previews.
// - script-src 'unsafe-inline': Next mete scripts inline para hidratar la
//   página; quitarlo requeriría nonces y renderizar todo dinámico.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://vercel.live https://vercel.com",
  "font-src 'self' data: https://vercel.live",
  "connect-src 'self' https://vercel.live wss://ws-us3.pusher.com",
  "frame-src https://vercel.live",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara solo la usa el escáner de QR del panel (mismo dominio).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // No anunciar "X-Powered-By: Next.js".
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // El límite por defecto (1 MB) se queda corto para subir la foto de
      // una pieza de segunda mano (hasta 5 MB) — se deja margen para el
      // overhead de multipart/form-data y el resto de los campos.
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
