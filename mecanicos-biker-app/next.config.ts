import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El límite por defecto (1 MB) se queda corto para subir la foto de
      // una pieza de segunda mano (hasta 5 MB) — se deja margen para el
      // overhead de multipart/form-data y el resto de los campos.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
