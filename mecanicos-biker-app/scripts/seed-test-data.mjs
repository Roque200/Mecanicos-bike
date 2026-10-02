// Siembra datos de muestra (productos, citas, pedidos, testimonios) en la
// base de datos que apunte DATABASE_URL — pensado para desarrollo local y
// para que la suite de Playwright tenga datos reales con qué probar.
//
// NUNCA se ejecuta automáticamente contra producción; es un paso explícito:
//   DATABASE_URL=... node scripts/seed-test-data.mjs
//
// Es seguro correrlo más de una vez: si ya hay productos, no hace nada.
import postgres from "postgres";
import crypto from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const sql = postgres(connectionString, { ssl: isLocal ? false : "require" });

const [{ n }] = await sql`SELECT COUNT(*)::int as n FROM products`;
if (n > 0) {
  console.log("Ya hay productos — no se vuelve a sembrar.");
  await sql.end();
  process.exit(0);
}

const products = [
  { id: "PR-01", name: "Casco MTB ProShield", category: "accesorios", description: "Ajuste giratorio, ventilación de 18 puertos y certificación de impacto.", price: 890, stock: 14, low_stock_threshold: 5 },
  { id: "PR-02", name: "Guantes ReinforceGrip", category: "accesorios", description: "Palma reforzada anti-vibración, dedos táctiles para pantalla.", price: 350, stock: 22, low_stock_threshold: 8 },
  { id: "PR-03", name: "Cámara MTB 29\"", category: "componentes", description: "Butilo estándar, válvula Presta 48mm, compatible rodada 29.", price: 180, stock: 4, low_stock_threshold: 10 },
  { id: "PR-04", name: "Llanta Tubeless 29x2.3", category: "componentes", description: "Compuesto de baja resistencia a la rodadura, refuerzo anti-ponchaduras.", price: 1190, stock: 7, low_stock_threshold: 4 },
  { id: "PR-05", name: "Cadena 12 velocidades", category: "componentes", description: "Recubrimiento anticorrosivo, compatible con la mayoría de grupos 12V.", price: 650, stock: 11, low_stock_threshold: 5 },
  { id: "PR-06", name: "Pastillas de freno semi-metálicas", category: "componentes", description: "Mayor mordida en mojado, compatibles con las principales marcas.", price: 280, stock: 3, low_stock_threshold: 6 },
  { id: "PR-07", name: "Lubricante de cadena (cera)", category: "cuidado", description: "Fórmula en cera de baja adherencia al polvo, para clima seco y mixto.", price: 220, stock: 18, low_stock_threshold: 6 },
  { id: "PR-08", name: "Multiherramienta 16 en 1", category: "herramientas", description: "Llaves Allen, desarmadores y desmontallantas en un solo cuerpo.", price: 450, stock: 9, low_stock_threshold: 5 },
];
for (const p of products) {
  await sql`
    INSERT INTO products (id, name, category, description, price, stock, low_stock_threshold)
    VALUES (${p.id}, ${p.name}, ${p.category}, ${p.description}, ${p.price}, ${p.stock}, ${p.low_stock_threshold})
  `;
}

const rewardItems = [
  { id: "RW-01", name: "10% de descuento en tu próxima visita", points_cost: 3 },
  { id: "RW-02", name: "Cambio de cadena gratis", points_cost: 5 },
  { id: "RW-03", name: "Afinación general gratis", points_cost: 8 },
];
for (const r of rewardItems) {
  await sql`INSERT INTO reward_items (id, name, points_cost, active) VALUES (${r.id}, ${r.name}, ${r.points_cost}, 1)`;
}

const appointments = [
  { id: "C-1042", customer: "Javier Ramírez", phone: "461 100 2233", service: "Servicio avanzado", date: "2026-09-10", hour: "09:00", status: "confirmada" },
  { id: "C-1043", customer: "Carla Mendoza", phone: "461 118 4455", service: "Servicio intermedio", date: "2026-09-10", hour: "11:00", status: "pendiente" },
  { id: "C-1044", customer: "Diego Herrera", phone: "461 122 7788", service: "Servicio de frenos", date: "2026-09-10", hour: "13:00", status: "en_proceso" },
  { id: "C-1045", customer: "Laura Pineda", phone: "461 130 9911", service: "Servicio de shifter y desviador", date: "2026-09-11", hour: "10:00", status: "confirmada" },
  { id: "C-1046", customer: "Mariana Ríos", phone: "461 144 2200", service: "Servicio básico", date: "2026-09-11", hour: "15:00", status: "pendiente" },
  { id: "C-1047", customer: "Roberto Salas", phone: "461 155 3311", service: "Servicio avanzado", date: "2026-09-09", hour: "12:00", status: "completada" },
  { id: "C-1048", customer: "Ana Torres", phone: "461 166 4422", service: "Servicio intermedio", date: "2026-09-09", hour: "16:00", status: "cancelada" },
  { id: "C-1049", customer: "Luis Fernández", phone: "461 177 5533", service: "Servicio de frenos", date: "2026-09-08", hour: "09:00", status: "completada" },
];
for (const a of appointments) {
  await sql`
    INSERT INTO appointments (id, qr_token, customer, phone, service, date, hour, status)
    VALUES (${a.id}, ${crypto.randomUUID()}, ${a.customer}, ${a.phone}, ${a.service}, ${a.date}, ${a.hour}, ${a.status})
  `;
}

const orders = [
  { id: "P-3301", customer: "Javier Ramírez", phone: "461 100 2233", status: "pagado", date: "2026-09-09", items: [{ name: "Casco MTB ProShield", qty: 1, price: 890 }] },
  { id: "P-3302", customer: "Carla Mendoza", phone: "461 118 4455", status: "pendiente", date: "2026-09-09", items: [{ name: "Cámara MTB 29\"", qty: 2, price: 180 }, { name: "Lubricante de cadena (cera)", qty: 1, price: 220 }] },
  { id: "P-3303", customer: "Diego Herrera", phone: "461 122 7788", status: "entregado", date: "2026-09-08", items: [{ name: "Multiherramienta 16 en 1", qty: 1, price: 450 }] },
  { id: "P-3304", customer: "Ana Torres", phone: "461 166 4422", status: "pagado", date: "2026-09-07", items: [{ name: "Llanta Tubeless 29x2.3", qty: 2, price: 1190 }] },
  { id: "P-3305", customer: "Roberto Salas", phone: "461 155 3311", status: "cancelado", date: "2026-09-06", items: [{ name: "Pastillas de freno semi-metálicas", qty: 1, price: 280 }] },
];
for (const o of orders) {
  await sql`INSERT INTO orders (id, customer, phone, status, payment_method, date) VALUES (${o.id}, ${o.customer}, ${o.phone}, ${o.status}, 'whatsapp', ${o.date})`;
  for (const item of o.items) {
    await sql`INSERT INTO order_items (order_id, name, price, qty) VALUES (${o.id}, ${item.name}, ${item.price}, ${item.qty})`;
  }
}

const testimonials = [
  { id: "TM-01", name: "Javier Ramírez", role: "Cliente frecuente", quote: "Le hicieron servicio completo de suspensión a mi bici y quedó como nueva. Explicaron cada cosa que le hicieron.", stars: 5, status: "aprobado" },
  { id: "TM-02", name: "Carla Mendoza", role: "Ciclista de ruta y MTB", quote: "Cotización clara desde el principio y sin sorpresas al final. Ahora es mi único taller de confianza.", stars: 5, status: "aprobado" },
  { id: "TM-03", name: "Diego Herrera", role: "Enduro rider", quote: "El servicio express en verdad cumple: dejé mi bici en la mañana y ya en la tarde estaba lista.", stars: 4, status: "aprobado" },
];
for (const t of testimonials) {
  await sql`INSERT INTO testimonials (id, name, role, quote, stars, status) VALUES (${t.id}, ${t.name}, ${t.role}, ${t.quote}, ${t.stars}, ${t.status})`;
}

await sql`INSERT INTO counters (name, value) VALUES ('appointments', 1049) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;
await sql`INSERT INTO counters (name, value) VALUES ('orders', 3305) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;
await sql`INSERT INTO counters (name, value) VALUES ('products', 8) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;
await sql`INSERT INTO counters (name, value) VALUES ('reward_items', 3) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;
await sql`INSERT INTO counters (name, value) VALUES ('testimonials', 3) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;
await sql`INSERT INTO counters (name, value) VALUES ('secondhand_items', 0) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;
await sql`INSERT INTO counters (name, value) VALUES ('customers', 0) ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value`;

console.log("Datos de muestra sembrados.");
await sql.end();
