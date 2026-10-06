import type { MetadataRoute } from "next";

const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/paquetes`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/tienda`, changeFrequency: "daily", priority: 0.8 },
  ];
}
