import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // El panel, las citas y los pedidos son privados: nada que indexar.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cita/", "/pedido/", "/api/"] },
    sitemap: process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/sitemap.xml`
      : undefined,
  };
}
