// Reglas de las fotos de productos, compartidas por el panel (para avisar
// antes de enviar) y el servidor (que es quien las hace cumplir).
export const MAX_PRODUCT_PHOTOS = 5;

// Vercel rechaza peticiones de más de 4.5 MB: todas las fotos nuevas de un
// mismo guardado, ya reducidas, deben caber juntas.
export const MAX_PRODUCT_UPLOAD_BYTES = 4 * 1024 * 1024;
