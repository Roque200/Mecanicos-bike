import Database from "better-sqlite3";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { pointsForService } from "./services";
import { isoDate, startOfDay, computeHoursForDate, formatHour, type WeeklyDaySchedule, type ScheduleOverride } from "./booking";

export type { WeeklyDaySchedule, ScheduleOverride };

export type AppointmentStatus = "pendiente" | "confirmada" | "en_proceso" | "completada" | "cancelada";
export type OrderStatus = "pendiente" | "pagado" | "entregado" | "cancelado";
export type PaymentMethod = "whatsapp" | "mercadopago" | "mostrador";
export type ProductCategory = "componentes" | "accesorios" | "cuidado" | "herramientas";

const DEFAULT_WEEKLY_SCHEDULE: WeeklyDaySchedule[] = [
  { dayOfWeek: 0, isOpen: false, openHour: 9, closeHour: 14 }, // domingo
  { dayOfWeek: 1, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 2, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 3, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 4, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 5, isOpen: true, openHour: 9, closeHour: 18 },
  { dayOfWeek: 6, isOpen: true, openHour: 9, closeHour: 14 }, // sábado
];

const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "pendiente",
  "confirmada",
  "en_proceso",
  "completada",
  "cancelada",
];
const ORDER_STATUSES: readonly OrderStatus[] = ["pendiente", "pagado", "entregado", "cancelado"];

export type Appointment = {
  id: string;
  qrToken: string;
  customer: string;
  phone: string;
  service: string;
  date: string;
  hour: string;
  status: AppointmentStatus;
  checkedInAt: string | null;
  notes: string | null;
  amount: number | null;
};

export type OrderItem = { name: string; price: number; qty: number };
export type Order = {
  id: string;
  customer: string;
  phone: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  mpPaymentId: string | null;
  date: string;
};

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  rewardPoints: number;
  rewardLifetime: number;
  rewardsRedeemed: number;
  lastReward: string | null;
};

export type RewardItem = {
  id: string;
  name: string;
  pointsCost: number;
  active: boolean;
};

export type TestimonialStatus = "pendiente" | "aprobado" | "rechazado";

export type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  stars: number;
  status: TestimonialStatus;
  createdAt: string;
};

export type SecondHandStatus = "disponible" | "vendido";

export type SecondHandItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  condition: string;
  imagePath: string | null;
  status: SecondHandStatus;
  createdAt: string;
};

// Next.js hot-reloads modules in dev, which would otherwise reopen the file
// and re-run seeding on every edit — stash the connection on globalThis.
declare global {
  var __mecanicosDb: Database.Database | undefined;
}

function openDb() {
  const dbPath = path.join(process.cwd(), "data", "mecanicos-biker.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      low_stock_threshold INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT,
      visits INTEGER NOT NULL DEFAULT 0,
      total_spent INTEGER NOT NULL DEFAULT 0,
      last_visit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      qr_token TEXT NOT NULL UNIQUE,
      customer TEXT NOT NULL,
      phone TEXT NOT NULL,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      hour TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      checked_in_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot
      ON appointments(date, hour)
      WHERE status != 'cancelada';

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      payment_method TEXT NOT NULL DEFAULT 'whatsapp',
      mp_preference_id TEXT,
      mp_payment_id TEXT,
      date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id),
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      qty INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reward_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      points_cost INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS weekly_schedule (
      day_of_week INTEGER PRIMARY KEY,
      is_open INTEGER NOT NULL,
      open_hour INTEGER NOT NULL,
      close_hour INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_overrides (
      date TEXT PRIMARY KEY,
      closed INTEGER NOT NULL,
      open_hour INTEGER,
      close_hour INTEGER,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      quote TEXT NOT NULL,
      stars INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS secondhand_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      condition TEXT NOT NULL DEFAULT '',
      image_path TEXT,
      status TEXT NOT NULL DEFAULT 'disponible',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Added after the initial release — ensureColumn keeps existing local
  // databases (which predate these columns) working without a manual reset.
  ensureColumn(db, "customers", "reward_points", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "customers", "reward_lifetime", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "customers", "rewards_redeemed", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "customers", "last_reward", "TEXT");
  ensureColumn(db, "appointments", "amount", "INTEGER");
  // Se quitaron del formulario de segunda mano — no se piden datos del dueño.
  dropColumnIfExists(db, "secondhand_items", "owner_name");
  dropColumnIfExists(db, "secondhand_items", "owner_phone");

  // El horario semanal debe existir siempre (no solo en bases de datos
  // nuevas) — si la tabla está vacía, se llena con el horario que el taller
  // ya usaba antes de que el administrador pudiera configurarlo.
  const { n: weeklyRows } = db.prepare("SELECT COUNT(*) as n FROM weekly_schedule").get() as { n: number };
  if (weeklyRows === 0) {
    const insertDay = db.prepare(
      "INSERT INTO weekly_schedule (day_of_week, is_open, open_hour, close_hour) VALUES (@dayOfWeek, @isOpen, @openHour, @closeHour)",
    );
    const seedWeekly = db.transaction(() => {
      for (const day of DEFAULT_WEEKLY_SCHEDULE) insertDay.run({ ...day, isOpen: day.isOpen ? 1 : 0 });
    });
    seedWeekly();
  }
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function dropColumnIfExists(db: Database.Database, table: string, column: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}

function seedIfEmpty(db: Database.Database) {
  const { n } = db.prepare("SELECT COUNT(*) as n FROM products").get() as { n: number };
  if (n > 0) return;

  const insertProduct = db.prepare(
    "INSERT INTO products (id, name, category, description, price, stock, low_stock_threshold) VALUES (@id, @name, @category, @description, @price, @stock, @lowStockThreshold)",
  );
  const insertRewardItem = db.prepare(
    "INSERT INTO reward_items (id, name, points_cost, active) VALUES (@id, @name, @pointsCost, @active)",
  );
  const insertAppointment = db.prepare(
    "INSERT INTO appointments (id, qr_token, customer, phone, service, date, hour, status) VALUES (@id, @qrToken, @customer, @phone, @service, @date, @hour, @status)",
  );
  const insertOrder = db.prepare(
    "INSERT INTO orders (id, customer, phone, status, payment_method, date) VALUES (@id, @customer, @phone, @status, 'whatsapp', @date)",
  );
  const insertOrderItem = db.prepare(
    "INSERT INTO order_items (order_id, name, price, qty) VALUES (@orderId, @name, @price, @qty)",
  );
  const insertTestimonial = db.prepare(
    "INSERT INTO testimonials (id, name, role, quote, stars, status) VALUES (@id, @name, @role, @quote, @stars, @status)",
  );
  const setCounter = db.prepare("INSERT OR REPLACE INTO counters (name, value) VALUES (?, ?)");

  const seed = db.transaction(() => {
    const products: Product[] = [
      { id: "PR-01", name: "Casco MTB ProShield", category: "accesorios", description: "Ajuste giratorio, ventilación de 18 puertos y certificación de impacto.", price: 890, stock: 14, lowStockThreshold: 5 },
      { id: "PR-02", name: "Guantes ReinforceGrip", category: "accesorios", description: "Palma reforzada anti-vibración, dedos táctiles para pantalla.", price: 350, stock: 22, lowStockThreshold: 8 },
      { id: "PR-03", name: "Cámara MTB 29\"", category: "componentes", description: "Butilo estándar, válvula Presta 48mm, compatible rodada 29.", price: 180, stock: 4, lowStockThreshold: 10 },
      { id: "PR-04", name: "Llanta Tubeless 29x2.3", category: "componentes", description: "Compuesto de baja resistencia a la rodadura, refuerzo anti-ponchaduras.", price: 1190, stock: 7, lowStockThreshold: 4 },
      { id: "PR-05", name: "Cadena 12 velocidades", category: "componentes", description: "Recubrimiento anticorrosivo, compatible con la mayoría de grupos 12V.", price: 650, stock: 11, lowStockThreshold: 5 },
      { id: "PR-06", name: "Pastillas de freno semi-metálicas", category: "componentes", description: "Mayor mordida en mojado, compatibles con las principales marcas.", price: 280, stock: 3, lowStockThreshold: 6 },
      { id: "PR-07", name: "Lubricante de cadena (cera)", category: "cuidado", description: "Fórmula en cera de baja adherencia al polvo, para clima seco y mixto.", price: 220, stock: 18, lowStockThreshold: 6 },
      { id: "PR-08", name: "Multiherramienta 16 en 1", category: "herramientas", description: "Llaves Allen, desarmadores y desmontallantas en un solo cuerpo.", price: 450, stock: 9, lowStockThreshold: 5 },
    ];
    for (const p of products) insertProduct.run(p);

    // Sin clientes de muestra por ahora — se crean solos en cuanto alguien
    // agenda una cita o hace un pedido real, para probar los casos de uso
    // desde cero.

    const rewardItems: RewardItem[] = [
      { id: "RW-01", name: "10% de descuento en tu próxima visita", pointsCost: 3, active: true },
      { id: "RW-02", name: "Cambio de cadena gratis", pointsCost: 5, active: true },
      { id: "RW-03", name: "Afinación general gratis", pointsCost: 8, active: true },
    ];
    for (const r of rewardItems) insertRewardItem.run({ ...r, active: r.active ? 1 : 0 });

    const appointments: Omit<Appointment, "checkedInAt" | "notes" | "amount">[] = [
      { id: "C-1042", qrToken: crypto.randomUUID(), customer: "Javier Ramírez", phone: "461 100 2233", service: "Servicio avanzado", date: "2026-09-10", hour: "09:00", status: "confirmada" },
      { id: "C-1043", qrToken: crypto.randomUUID(), customer: "Carla Mendoza", phone: "461 118 4455", service: "Servicio intermedio", date: "2026-09-10", hour: "11:00", status: "pendiente" },
      { id: "C-1044", qrToken: crypto.randomUUID(), customer: "Diego Herrera", phone: "461 122 7788", service: "Servicio de frenos", date: "2026-09-10", hour: "13:00", status: "en_proceso" },
      { id: "C-1045", qrToken: crypto.randomUUID(), customer: "Laura Pineda", phone: "461 130 9911", service: "Servicio de shifter y desviador", date: "2026-09-11", hour: "10:00", status: "confirmada" },
      { id: "C-1046", qrToken: crypto.randomUUID(), customer: "Mariana Ríos", phone: "461 144 2200", service: "Servicio básico", date: "2026-09-11", hour: "15:00", status: "pendiente" },
      { id: "C-1047", qrToken: crypto.randomUUID(), customer: "Roberto Salas", phone: "461 155 3311", service: "Servicio avanzado", date: "2026-09-09", hour: "12:00", status: "completada" },
      { id: "C-1048", qrToken: crypto.randomUUID(), customer: "Ana Torres", phone: "461 166 4422", service: "Servicio intermedio", date: "2026-09-09", hour: "16:00", status: "cancelada" },
      { id: "C-1049", qrToken: crypto.randomUUID(), customer: "Luis Fernández", phone: "461 177 5533", service: "Servicio de frenos", date: "2026-09-08", hour: "09:00", status: "completada" },
    ];
    for (const a of appointments) insertAppointment.run(a);

    const orders: { id: string; customer: string; phone: string; status: OrderStatus; date: string; items: OrderItem[] }[] = [
      { id: "P-3301", customer: "Javier Ramírez", phone: "461 100 2233", status: "pagado", date: "2026-09-09", items: [{ name: "Casco MTB ProShield", qty: 1, price: 890 }] },
      { id: "P-3302", customer: "Carla Mendoza", phone: "461 118 4455", status: "pendiente", date: "2026-09-09", items: [{ name: "Cámara MTB 29\"", qty: 2, price: 180 }, { name: "Lubricante de cadena (cera)", qty: 1, price: 220 }] },
      { id: "P-3303", customer: "Diego Herrera", phone: "461 122 7788", status: "entregado", date: "2026-09-08", items: [{ name: "Multiherramienta 16 en 1", qty: 1, price: 450 }] },
      { id: "P-3304", customer: "Ana Torres", phone: "461 166 4422", status: "pagado", date: "2026-09-07", items: [{ name: "Llanta Tubeless 29x2.3", qty: 2, price: 1190 }] },
      { id: "P-3305", customer: "Roberto Salas", phone: "461 155 3311", status: "cancelado", date: "2026-09-06", items: [{ name: "Pastillas de freno semi-metálicas", qty: 1, price: 280 }] },
    ];
    for (const o of orders) {
      insertOrder.run(o);
      for (const item of o.items) insertOrderItem.run({ orderId: o.id, ...item });
    }

    const testimonials: Omit<Testimonial, "createdAt">[] = [
      { id: "TM-01", name: "Javier Ramírez", role: "Cliente frecuente", quote: "Le hicieron servicio completo de suspensión a mi bici y quedó como nueva. Explicaron cada cosa que le hicieron.", stars: 5, status: "aprobado" },
      { id: "TM-02", name: "Carla Mendoza", role: "Ciclista de ruta y MTB", quote: "Cotización clara desde el principio y sin sorpresas al final. Ahora es mi único taller de confianza.", stars: 5, status: "aprobado" },
      { id: "TM-03", name: "Diego Herrera", role: "Enduro rider", quote: "El servicio express en verdad cumple: dejé mi bici en la mañana y ya en la tarde estaba lista.", stars: 4, status: "aprobado" },
    ];
    for (const t of testimonials) insertTestimonial.run(t);

    setCounter.run("appointments", 1049);
    setCounter.run("orders", 3305);
    setCounter.run("products", 8);
    setCounter.run("reward_items", 3);
    setCounter.run("testimonials", 3);
    setCounter.run("secondhand_items", 0);
  });

  seed();
}

export function getDb() {
  if (!globalThis.__mecanicosDb) {
    globalThis.__mecanicosDb = openDb();
  }
  return globalThis.__mecanicosDb;
}

function nextSeq(name: string, startAt: number) {
  const db = getDb();
  const row = db.prepare("SELECT value FROM counters WHERE name = ?").get(name) as { value: number } | undefined;
  const next = (row?.value ?? startAt) + 1;
  db.prepare("INSERT OR REPLACE INTO counters (name, value) VALUES (?, ?)").run(name, next);
  return next;
}

// ---------- Products ----------

function rowToProduct(row: {
  id: string; name: string; category: string; description: string; price: number; stock: number; low_stock_threshold: number;
}): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category as ProductCategory,
    description: row.description,
    price: row.price,
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
  };
}

export function listProducts(): Product[] {
  const rows = getDb().prepare("SELECT * FROM products ORDER BY name ASC").all();
  return (rows as Parameters<typeof rowToProduct>[0][]).map(rowToProduct);
}

export function getProduct(id: string): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ?").get(id);
  return row ? rowToProduct(row as Parameters<typeof rowToProduct>[0]) : null;
}

export function createProduct(input: Omit<Product, "id">): Product {
  const id = `PR-${String(nextSeq("products", 8)).padStart(2, "0")}`;
  getDb()
    .prepare(
      "INSERT INTO products (id, name, category, description, price, stock, low_stock_threshold) VALUES (@id, @name, @category, @description, @price, @stock, @lowStockThreshold)",
    )
    .run({ id, ...input });
  return { id, ...input };
}

export function updateProduct(id: string, input: Omit<Product, "id">) {
  getDb()
    .prepare(
      "UPDATE products SET name=@name, category=@category, description=@description, price=@price, stock=@stock, low_stock_threshold=@lowStockThreshold WHERE id=@id",
    )
    .run({ id, ...input });
}

export function deleteProduct(id: string) {
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
}

// ---------- Customers ----------

function rowToCustomer(row: {
  id: string; name: string; phone: string; email: string | null; visits: number; total_spent: number; last_visit: string;
  reward_points: number; reward_lifetime: number; rewards_redeemed: number; last_reward: string | null;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    visits: row.visits,
    totalSpent: row.total_spent,
    lastVisit: row.last_visit,
    rewardPoints: row.reward_points,
    rewardLifetime: row.reward_lifetime,
    rewardsRedeemed: row.rewards_redeemed,
    lastReward: row.last_reward,
  };
}

export function listCustomers(): Customer[] {
  const rows = getDb().prepare("SELECT * FROM customers ORDER BY total_spent DESC").all();
  return (rows as Parameters<typeof rowToCustomer>[0][]).map(rowToCustomer);
}

export function getCustomer(id: string): Customer | null {
  const row = getDb().prepare("SELECT * FROM customers WHERE id = ?").get(id);
  return row ? rowToCustomer(row as Parameters<typeof rowToCustomer>[0]) : null;
}

// ---------- Reward catalog ----------

function rowToRewardItem(row: { id: string; name: string; points_cost: number; active: number }): RewardItem {
  return { id: row.id, name: row.name, pointsCost: row.points_cost, active: row.active === 1 };
}

export function listRewardItems(): RewardItem[] {
  const rows = getDb().prepare("SELECT * FROM reward_items ORDER BY points_cost ASC").all();
  return (rows as Parameters<typeof rowToRewardItem>[0][]).map(rowToRewardItem);
}

export function createRewardItem(input: { name: string; pointsCost: number }): RewardItem {
  const id = `RW-${String(nextSeq("reward_items", 3)).padStart(2, "0")}`;
  getDb()
    .prepare("INSERT INTO reward_items (id, name, points_cost, active) VALUES (?, ?, ?, 1)")
    .run(id, input.name, input.pointsCost);
  return { id, name: input.name, pointsCost: input.pointsCost, active: true };
}

export function updateRewardItem(id: string, input: { name: string; pointsCost: number; active: boolean }) {
  getDb()
    .prepare("UPDATE reward_items SET name = ?, points_cost = ?, active = ? WHERE id = ?")
    .run(input.name, input.pointsCost, input.active ? 1 : 0, id);
}

export function deleteRewardItem(id: string) {
  getDb().prepare("DELETE FROM reward_items WHERE id = ?").run(id);
}

export class NotEnoughPointsError extends Error {}
export class RewardItemNotFoundError extends Error {}

/** Canjea una recompensa del catálogo: descuenta su costo en puntos y registra cuál fue. */
export function redeemReward(customerId: string, rewardItemId: string): Customer {
  const db = getDb();
  const item = db.prepare("SELECT * FROM reward_items WHERE id = ?").get(rewardItemId) as
    | { name: string; points_cost: number }
    | undefined;
  if (!item) {
    throw new RewardItemNotFoundError("Ese premio ya no existe en el catálogo.");
  }
  const customer = db.prepare("SELECT reward_points FROM customers WHERE id = ?").get(customerId) as
    | { reward_points: number }
    | undefined;
  if (!customer || customer.reward_points < item.points_cost) {
    throw new NotEnoughPointsError("El cliente no tiene suficientes puntos para canjear ese premio.");
  }
  db.prepare(
    "UPDATE customers SET reward_points = reward_points - ?, rewards_redeemed = rewards_redeemed + 1, last_reward = ? WHERE id = ?",
  ).run(item.points_cost, item.name, customerId);
  return getCustomer(customerId)!;
}

/** Finds a customer by phone, creating one if needed, and records a visit + spend. */
function touchCustomer(db: Database.Database, name: string, phone: string, spend: number, visitDate: string) {
  const existing = db.prepare("SELECT * FROM customers WHERE phone = ?").get(phone) as
    | { id: string; visits: number; total_spent: number }
    | undefined;
  if (existing) {
    db.prepare(
      "UPDATE customers SET visits = visits + 1, total_spent = total_spent + ?, last_visit = ?, name = ? WHERE id = ?",
    ).run(spend, visitDate, name, existing.id);
    return;
  }
  const id = `CL-${String(nextSeq("customers", 0)).padStart(2, "0")}`;
  db.prepare(
    "INSERT INTO customers (id, name, phone, email, visits, total_spent, last_visit) VALUES (?, ?, ?, NULL, 1, ?, ?)",
  ).run(id, name, phone, spend, visitDate);
}

// ---------- Testimonios ----------

function rowToTestimonial(row: {
  id: string; name: string; role: string | null; quote: string; stars: number; status: string; created_at: string;
}): Testimonial {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    quote: row.quote,
    stars: row.stars,
    status: row.status as TestimonialStatus,
    createdAt: row.created_at,
  };
}

export function listApprovedTestimonials(): Testimonial[] {
  const rows = getDb()
    .prepare("SELECT * FROM testimonials WHERE status = 'aprobado' ORDER BY created_at DESC")
    .all();
  return (rows as Parameters<typeof rowToTestimonial>[0][]).map(rowToTestimonial);
}

export function listTestimonials(): Testimonial[] {
  const rows = getDb().prepare("SELECT * FROM testimonials ORDER BY created_at DESC").all();
  return (rows as Parameters<typeof rowToTestimonial>[0][]).map(rowToTestimonial);
}

export class InvalidTestimonialError extends Error {}

export function createTestimonial(input: { name: string; role: string | null; quote: string; stars: number }): Testimonial {
  const name = input.name.trim();
  const quote = input.quote.trim();
  if (!name) throw new InvalidTestimonialError("Tu nombre es obligatorio.");
  if (!quote) throw new InvalidTestimonialError("Escribe tu testimonio.");
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    throw new InvalidTestimonialError("La calificación debe ser de 1 a 5 estrellas.");
  }
  const id = `TM-${String(nextSeq("testimonials", 3)).padStart(2, "0")}`;
  const role = input.role?.trim() || null;
  getDb()
    .prepare("INSERT INTO testimonials (id, name, role, quote, stars, status) VALUES (?, ?, ?, ?, ?, 'pendiente')")
    .run(id, name, role, quote, input.stars);
  return { id, name, role, quote, stars: input.stars, status: "pendiente", createdAt: new Date().toISOString() };
}

export function updateTestimonialStatus(id: string, status: TestimonialStatus) {
  getDb().prepare("UPDATE testimonials SET status = ? WHERE id = ?").run(status, id);
}

export function deleteTestimonial(id: string) {
  getDb().prepare("DELETE FROM testimonials WHERE id = ?").run(id);
}

// ---------- Segunda mano ----------

function rowToSecondHandItem(row: {
  id: string; name: string; description: string; price: number; condition: string;
  image_path: string | null; status: string; created_at: string;
}): SecondHandItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    condition: row.condition,
    imagePath: row.image_path,
    status: row.status as SecondHandStatus,
    createdAt: row.created_at,
  };
}

export function listAvailableSecondHandItems(): SecondHandItem[] {
  const rows = getDb()
    .prepare("SELECT * FROM secondhand_items WHERE status = 'disponible' ORDER BY created_at DESC")
    .all();
  return (rows as Parameters<typeof rowToSecondHandItem>[0][]).map(rowToSecondHandItem);
}

export function listSecondHandItems(): SecondHandItem[] {
  const rows = getDb().prepare("SELECT * FROM secondhand_items ORDER BY created_at DESC").all();
  return (rows as Parameters<typeof rowToSecondHandItem>[0][]).map(rowToSecondHandItem);
}

export class InvalidSecondHandItemError extends Error {}

function sanitizeSecondHandInput(input: { name: string; description: string; price: number; condition: string }) {
  const name = input.name.trim();
  if (!name) throw new InvalidSecondHandItemError("El nombre de la pieza es obligatorio.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new InvalidSecondHandItemError("El precio debe ser 0 o mayor.");
  return { ...input, name, description: input.description.trim(), condition: input.condition.trim() };
}

export function createSecondHandItem(input: {
  name: string;
  description: string;
  price: number;
  condition: string;
  imagePath: string | null;
}): SecondHandItem {
  const clean = sanitizeSecondHandInput(input);
  const id = `SH-${String(nextSeq("secondhand_items", 0)).padStart(2, "0")}`;
  getDb()
    .prepare(
      "INSERT INTO secondhand_items (id, name, description, price, condition, image_path, status) " +
        "VALUES (@id, @name, @description, @price, @condition, @imagePath, 'disponible')",
    )
    .run({ id, ...clean, imagePath: input.imagePath });
  return { id, ...clean, imagePath: input.imagePath, status: "disponible", createdAt: new Date().toISOString() };
}

export function updateSecondHandItem(
  id: string,
  input: { name: string; description: string; price: number; condition: string; imagePath: string | null },
): void {
  const clean = sanitizeSecondHandInput(input);
  getDb()
    .prepare(
      "UPDATE secondhand_items SET name=@name, description=@description, price=@price, condition=@condition, " +
        "image_path=@imagePath WHERE id=@id",
    )
    .run({ id, ...clean, imagePath: input.imagePath });
}

export function updateSecondHandStatus(id: string, status: SecondHandStatus) {
  getDb().prepare("UPDATE secondhand_items SET status = ? WHERE id = ?").run(status, id);
}

export function deleteSecondHandItem(id: string): SecondHandItem | null {
  const existing = getDb().prepare("SELECT * FROM secondhand_items WHERE id = ?").get(id) as
    | Parameters<typeof rowToSecondHandItem>[0]
    | undefined;
  if (!existing) return null;
  getDb().prepare("DELETE FROM secondhand_items WHERE id = ?").run(id);
  return rowToSecondHandItem(existing);
}

// ---------- Horario ----------

function rowToWeeklyDay(row: { day_of_week: number; is_open: number; open_hour: number; close_hour: number }): WeeklyDaySchedule {
  return { dayOfWeek: row.day_of_week, isOpen: row.is_open === 1, openHour: row.open_hour, closeHour: row.close_hour };
}

function rowToOverride(row: { date: string; closed: number; open_hour: number | null; close_hour: number | null; note: string | null }): ScheduleOverride {
  return { date: row.date, closed: row.closed === 1, openHour: row.open_hour, closeHour: row.close_hour, note: row.note };
}

export function getWeeklySchedule(): WeeklyDaySchedule[] {
  const rows = getDb().prepare("SELECT * FROM weekly_schedule ORDER BY day_of_week ASC").all();
  return (rows as Parameters<typeof rowToWeeklyDay>[0][]).map(rowToWeeklyDay);
}

export class InvalidScheduleError extends Error {}

export function updateWeeklySchedule(days: WeeklyDaySchedule[]) {
  for (const day of days) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) throw new InvalidScheduleError("Día de la semana inválido.");
    if (!Number.isInteger(day.openHour) || !Number.isInteger(day.closeHour) || day.openHour < 0 || day.closeHour > 23) {
      throw new InvalidScheduleError("Las horas deben ser enteros entre 0 y 23.");
    }
    if (day.isOpen && day.openHour > day.closeHour) {
      throw new InvalidScheduleError("La hora de apertura no puede ser después de la hora de cierre.");
    }
  }
  const db = getDb();
  const update = db.prepare(
    "UPDATE weekly_schedule SET is_open = @isOpen, open_hour = @openHour, close_hour = @closeHour WHERE day_of_week = @dayOfWeek",
  );
  const run = db.transaction(() => {
    for (const day of days) update.run({ ...day, isOpen: day.isOpen ? 1 : 0 });
  });
  run();
}

export function getScheduleOverride(date: string): ScheduleOverride | null {
  const row = getDb().prepare("SELECT * FROM schedule_overrides WHERE date = ?").get(date);
  return row ? rowToOverride(row as Parameters<typeof rowToOverride>[0]) : null;
}

export function listScheduleOverrides(): ScheduleOverride[] {
  const rows = getDb().prepare("SELECT * FROM schedule_overrides ORDER BY date ASC").all();
  return (rows as Parameters<typeof rowToOverride>[0][]).map(rowToOverride);
}

export function listScheduleOverridesInRange(from: string, to: string): ScheduleOverride[] {
  const rows = getDb().prepare("SELECT * FROM schedule_overrides WHERE date BETWEEN ? AND ? ORDER BY date ASC").all(from, to);
  return (rows as Parameters<typeof rowToOverride>[0][]).map(rowToOverride);
}

export function upsertScheduleOverride(input: {
  date: string;
  closed: boolean;
  openHour: number | null;
  closeHour: number | null;
  note: string | null;
}): ScheduleOverride {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new InvalidScheduleError("Fecha inválida.");
  if (!input.closed) {
    if (input.openHour == null || input.closeHour == null) {
      throw new InvalidScheduleError("Indica la hora de apertura y cierre, o marca el día como cerrado.");
    }
    if (
      !Number.isInteger(input.openHour) ||
      !Number.isInteger(input.closeHour) ||
      input.openHour < 0 ||
      input.closeHour > 23 ||
      input.openHour > input.closeHour
    ) {
      throw new InvalidScheduleError("Las horas de la excepción no son válidas.");
    }
  }
  getDb()
    .prepare(
      "INSERT INTO schedule_overrides (date, closed, open_hour, close_hour, note) VALUES (@date, @closed, @openHour, @closeHour, @note) " +
        "ON CONFLICT(date) DO UPDATE SET closed = @closed, open_hour = @openHour, close_hour = @closeHour, note = @note",
    )
    .run({
      date: input.date,
      closed: input.closed ? 1 : 0,
      openHour: input.closed ? null : input.openHour,
      closeHour: input.closed ? null : input.closeHour,
      note: input.note?.trim() || null,
    });
  return getScheduleOverride(input.date)!;
}

export function deleteScheduleOverride(date: string) {
  getDb().prepare("DELETE FROM schedule_overrides WHERE date = ?").run(date);
}

// ---------- Appointments ----------

function rowToAppointment(row: {
  id: string; qr_token: string; customer: string; phone: string; service: string; date: string; hour: string;
  status: string; checked_in_at: string | null; notes: string | null; amount: number | null;
}): Appointment {
  return {
    id: row.id,
    qrToken: row.qr_token,
    customer: row.customer,
    phone: row.phone,
    service: row.service,
    date: row.date,
    hour: row.hour,
    status: row.status as AppointmentStatus,
    checkedInAt: row.checked_in_at,
    notes: row.notes,
    amount: row.amount,
  };
}

export function listAppointments(): Appointment[] {
  const rows = getDb().prepare("SELECT * FROM appointments ORDER BY date DESC, hour DESC").all();
  return (rows as Parameters<typeof rowToAppointment>[0][]).map(rowToAppointment);
}

export function getAppointmentByToken(token: string): Appointment | null {
  const row = getDb().prepare("SELECT * FROM appointments WHERE qr_token = ?").get(token);
  return row ? rowToAppointment(row as Parameters<typeof rowToAppointment>[0]) : null;
}

/** Busy hours per date (yyyy-mm-dd) within [from, to], excluding cancelled appointments. */
export function getBusyHoursInRange(from: string, to: string): Record<string, string[]> {
  const rows = getDb()
    .prepare("SELECT date, hour FROM appointments WHERE date BETWEEN ? AND ? AND status != 'cancelada'")
    .all(from, to) as { date: string; hour: string }[];
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    (map[row.date] ??= []).push(row.hour);
  }
  return map;
}

export class SlotTakenError extends Error {}
export class InvalidAppointmentError extends Error {}

/** Reglas de negocio del horario — el front ya las respeta, pero el server las vuelve a exigir. */
function assertValidSlot(dateKey: string, hour: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new InvalidAppointmentError("Fecha inválida.");
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (isoDate(date) !== dateKey) throw new InvalidAppointmentError("Fecha inválida.");
  if (date.getTime() < startOfDay(new Date()).getTime()) {
    throw new InvalidAppointmentError("No se pueden agendar citas en fechas pasadas.");
  }
  const weekly = getWeeklySchedule();
  const override = getScheduleOverride(dateKey);
  const hours = computeHoursForDate(date, weekly, override ? { [dateKey]: override } : {});
  if (!hours.map(formatHour).includes(hour)) {
    throw new InvalidAppointmentError("Ese horario no está disponible.");
  }
}

export function createAppointment(input: {
  customer: string;
  phone: string;
  service: string;
  date: string;
  hour: string;
}): Appointment {
  const customer = input.customer.trim();
  const phone = input.phone.trim();
  const service = input.service.trim();
  if (!customer || !phone || !service) {
    throw new InvalidAppointmentError("Nombre, teléfono y servicio son obligatorios.");
  }
  assertValidSlot(input.date, input.hour);

  const db = getDb();
  const id = `C-${nextSeq("appointments", 1049)}`;
  const qrToken = crypto.randomUUID();
  try {
    db.prepare(
      "INSERT INTO appointments (id, qr_token, customer, phone, service, date, hour, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')",
    ).run(id, qrToken, customer, phone, service, input.date, input.hour);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed: appointments/.test(err.message)) {
      throw new SlotTakenError("Ese horario ya fue tomado.");
    }
    throw err;
  }
  touchCustomer(db, customer, phone, 0, input.date);
  return { id, qrToken, customer, phone, service, date: input.date, hour: input.hour, status: "pendiente", checkedInAt: null, notes: null, amount: null };
}

export function getAppointment(id: string): Appointment | null {
  const row = getDb().prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  return row ? rowToAppointment(row as Parameters<typeof rowToAppointment>[0]) : null;
}

/** Mueve una cita a otra fecha/hora, respetando el mismo horario configurado que valida las citas nuevas. */
export function rescheduleAppointment(id: string, date: string, hour: string): Appointment {
  const db = getDb();
  const current = getAppointment(id);
  if (!current) throw new InvalidAppointmentError("La cita no existe.");
  assertValidSlot(date, hour);
  try {
    db.prepare("UPDATE appointments SET date = ?, hour = ? WHERE id = ?").run(date, hour, id);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed: appointments/.test(err.message)) {
      throw new SlotTakenError("Ese horario ya fue tomado.");
    }
    throw err;
  }
  return getAppointment(id)!;
}

export class InvalidStatusError extends Error {}
export class AmountRequiredError extends Error {}

export function updateAppointmentStatus(id: string, status: AppointmentStatus, amount?: number) {
  if (!APPOINTMENT_STATUSES.includes(status)) {
    throw new InvalidStatusError("Estado de cita inválido.");
  }
  const db = getDb();
  const current = db.prepare("SELECT status, phone, service FROM appointments WHERE id = ?").get(id) as
    | { status: AppointmentStatus; phone: string; service: string }
    | undefined;
  const becomesCompleted = Boolean(current) && status === "completada" && current!.status !== "completada";
  if (becomesCompleted) {
    if (amount === undefined || !Number.isFinite(amount) || amount < 0) {
      throw new AmountRequiredError("Indica cuánto se cobró por el servicio para marcarlo como completado.");
    }
  }
  const run = db.transaction(() => {
    if (becomesCompleted) {
      db.prepare("UPDATE appointments SET status = ?, amount = ? WHERE id = ?").run(status, Math.round(amount!), id);
    } else {
      db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
    }
    // Puntos de recompensa según el tipo de servicio, al marcarlo completado,
    // solo una vez (no vuelve a sumar si el estado ya estaba en completada).
    if (current && becomesCompleted) {
      const points = pointsForService(current.service);
      db.prepare(
        "UPDATE customers SET reward_points = reward_points + ?, reward_lifetime = reward_lifetime + ? WHERE phone = ?",
      ).run(points, points, current.phone);
    }
  });
  run();
}

export function checkInAppointment(token: string): Appointment | null {
  const db = getDb();
  const appt = getAppointmentByToken(token);
  if (!appt) return null;
  const nextStatus: AppointmentStatus =
    appt.status === "pendiente" || appt.status === "confirmada" ? "en_proceso" : appt.status;
  db.prepare("UPDATE appointments SET checked_in_at = datetime('now'), status = ? WHERE qr_token = ?").run(
    nextStatus,
    token,
  );
  return getAppointmentByToken(token);
}

// ---------- Orders ----------

function rowsToOrder(orderRow: {
  id: string; customer: string; phone: string; status: string; payment_method: string; mp_payment_id: string | null; date: string;
}, itemRows: { name: string; price: number; qty: number }[]): Order {
  return {
    id: orderRow.id,
    customer: orderRow.customer,
    phone: orderRow.phone,
    status: orderRow.status as OrderStatus,
    paymentMethod: orderRow.payment_method as PaymentMethod,
    mpPaymentId: orderRow.mp_payment_id,
    date: orderRow.date,
    items: itemRows,
  };
}

export function listOrders(): Order[] {
  const db = getDb();
  const orderRows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all() as {
    id: string; customer: string; phone: string; status: string; payment_method: string; mp_payment_id: string | null; date: string;
  }[];
  const itemStmt = db.prepare("SELECT name, price, qty FROM order_items WHERE order_id = ?");
  return orderRows.map((row) => rowsToOrder(row, itemStmt.all(row.id) as { name: string; price: number; qty: number }[]));
}

export function getOrder(id: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as
    | { id: string; customer: string; phone: string; status: string; payment_method: string; mp_payment_id: string | null; date: string }
    | undefined;
  if (!row) return null;
  const items = db.prepare("SELECT name, price, qty FROM order_items WHERE order_id = ?").all(id) as {
    name: string; price: number; qty: number;
  }[];
  return rowsToOrder(row, items);
}

export class InvalidOrderError extends Error {}
export class ProductNotFoundError extends Error {}

export function createOrder(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number }[];
  paymentMethod: PaymentMethod;
}): Order {
  const customer = input.customer.trim();
  const phone = input.phone.trim();
  if (!customer || !phone) throw new InvalidOrderError("Nombre y teléfono son obligatorios.");
  if (input.items.length === 0) throw new InvalidOrderError("El pedido no tiene productos.");

  const db = getDb();
  const id = `P-${nextSeq("orders", 3305)}`;
  const getProductByName = db.prepare("SELECT * FROM products WHERE name = ?");
  // El precio SIEMPRE se toma de la base de datos, nunca de lo que mande el
  // navegador — así el cliente no puede decidir cuánto paga.
  const pricedItems: OrderItem[] = input.items.map((item) => {
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new InvalidOrderError(`Cantidad inválida para "${item.name}".`);
    }
    const product = getProductByName.get(item.name) as
      | { name: string; price: number; stock: number }
      | undefined;
    if (!product) throw new ProductNotFoundError(`"${item.name}" ya no está disponible.`);
    if (product.stock < item.qty) throw new InvalidOrderError(`No hay suficiente stock de "${item.name}".`);
    return { name: product.name, price: product.price, qty: item.qty };
  });
  const total = pricedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const date = new Date().toISOString().slice(0, 10);

  const create = db.transaction(() => {
    db.prepare(
      "INSERT INTO orders (id, customer, phone, status, payment_method) VALUES (?, ?, ?, 'pendiente', ?)",
    ).run(id, customer, phone, input.paymentMethod);
    const insertItem = db.prepare("INSERT INTO order_items (order_id, name, price, qty) VALUES (?, ?, ?, ?)");
    const decrementStock = db.prepare(
      "UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?",
    );
    for (const item of pricedItems) {
      insertItem.run(id, item.name, item.price, item.qty);
      decrementStock.run(item.qty, item.name);
    }
    touchCustomer(db, customer, phone, total, date);
  });
  create();
  return { id, customer, phone, items: pricedItems, paymentMethod: input.paymentMethod, status: "pendiente", mpPaymentId: null, date };
}

/**
 * Registra una venta de mostrador (trabajo o venta hecha en el taller sin
 * pasar por el carrito en línea). A diferencia de createOrder, el precio de
 * cada concepto lo da quien llama la función — solo llega hasta aquí después
 * de pasar por requireAdmin() en la acción, así que confiar en él es seguro;
 * permite además conceptos libres (mano de obra) que no existen en el
 * catálogo de productos. Queda pagada de inmediato, ya que el dinero ya se
 * cobró en el mostrador.
 */
export function createManualSale(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
}): Order {
  const customer = input.customer.trim();
  const phone = input.phone.trim();
  if (!customer || !phone) throw new InvalidOrderError("Nombre y teléfono son obligatorios.");
  if (input.items.length === 0) throw new InvalidOrderError("La venta no tiene conceptos.");

  const db = getDb();
  const id = `P-${nextSeq("orders", 3305)}`;
  const getProductByName = db.prepare("SELECT stock FROM products WHERE name = ?");
  const pricedItems: OrderItem[] = input.items.map((item) => {
    const name = item.name.trim();
    if (!name) throw new InvalidOrderError("Cada concepto necesita un nombre.");
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new InvalidOrderError(`Cantidad inválida para "${name}".`);
    }
    if (!Number.isFinite(item.price) || item.price < 0) {
      throw new InvalidOrderError(`Precio inválido para "${name}".`);
    }
    const product = getProductByName.get(name) as { stock: number } | undefined;
    if (product && product.stock < item.qty) throw new InvalidOrderError(`No hay suficiente stock de "${name}".`);
    return { name, price: item.price, qty: item.qty };
  });
  const total = pricedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const date = new Date().toISOString().slice(0, 10);

  const create = db.transaction(() => {
    db.prepare(
      "INSERT INTO orders (id, customer, phone, status, payment_method, date) VALUES (?, ?, ?, 'pagado', 'mostrador', ?)",
    ).run(id, customer, phone, date);
    const insertItem = db.prepare("INSERT INTO order_items (order_id, name, price, qty) VALUES (?, ?, ?, ?)");
    // Solo descuenta stock si el concepto corresponde a un producto real del
    // catálogo — un concepto libre (ej. mano de obra) no afecta inventario.
    const decrementStock = db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?");
    for (const item of pricedItems) {
      insertItem.run(id, item.name, item.price, item.qty);
      decrementStock.run(item.qty, item.name);
    }
    touchCustomer(db, customer, phone, total, date);
  });
  create();
  return { id, customer, phone, items: pricedItems, paymentMethod: "mostrador", status: "pagado", mpPaymentId: null, date };
}

/** Pedidos dentro de un rango de fechas [from, to], para el corte de caja. */
export function listOrdersInRange(from: string, to: string): Order[] {
  const db = getDb();
  const orderRows = db.prepare("SELECT * FROM orders WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC").all(
    from,
    to,
  ) as {
    id: string; customer: string; phone: string; status: string; payment_method: string; mp_payment_id: string | null; date: string;
  }[];
  const itemStmt = db.prepare("SELECT name, price, qty FROM order_items WHERE order_id = ?");
  return orderRows.map((row) => rowsToOrder(row, itemStmt.all(row.id) as { name: string; price: number; qty: number }[]));
}

/** Citas completadas con monto cobrado dentro de [from, to], para el corte de caja. */
export function listCompletedAppointmentsInRange(from: string, to: string): Appointment[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM appointments WHERE date BETWEEN ? AND ? AND status = 'completada' AND amount IS NOT NULL ORDER BY date ASC, hour ASC",
    )
    .all(from, to);
  return (rows as Parameters<typeof rowToAppointment>[0][]).map(rowToAppointment);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new InvalidStatusError("Estado de pedido inválido.");
  }
  const db = getDb();
  const current = db.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: OrderStatus } | undefined;
  const run = db.transaction(() => {
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
    // Cancelling releases the stock reserved when the order was placed.
    if (status === "cancelado" && current?.status !== "cancelado") {
      const items = db.prepare("SELECT name, qty FROM order_items WHERE order_id = ?").all(id) as {
        name: string;
        qty: number;
      }[];
      const restock = db.prepare("UPDATE products SET stock = stock + ? WHERE name = ?");
      for (const item of items) restock.run(item.qty, item.name);
    }
  });
  run();
}

export function setOrderPreference(id: string, preferenceId: string) {
  getDb().prepare("UPDATE orders SET mp_preference_id = ? WHERE id = ?").run(preferenceId, id);
}

export function markOrderPaid(orderId: string, paymentId: string): Order | null {
  const existing = getOrder(orderId);
  if (!existing) return null;
  getDb().prepare("UPDATE orders SET status = 'pagado', mp_payment_id = ? WHERE id = ?").run(paymentId, orderId);
  return getOrder(orderId);
}

export { orderTotal } from "./pricing";

// ---------- Dashboard ----------

export function getDashboardStats(today: string) {
  const db = getDb();
  const todayAppointments = (
    db.prepare("SELECT COUNT(*) as n FROM appointments WHERE date = ? AND status != 'cancelada'").get(today) as {
      n: number;
    }
  ).n;
  const pendingOrders = (
    db.prepare("SELECT COUNT(*) as n FROM orders WHERE status = 'pendiente'").get() as { n: number }
  ).n;
  const lowStock = listProducts().filter((p) => p.stock <= p.lowStockThreshold);

  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const fromKey = fourteenDaysAgo.toISOString().slice(0, 10);
  const orderRevenueRows = db
    .prepare(
      `SELECT o.date as date, SUM(oi.price * oi.qty) as total
       FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.date BETWEEN ? AND ? AND o.status != 'cancelado'
       GROUP BY o.date`,
    )
    .all(fromKey, today) as { date: string; total: number }[];
  // Las citas marcadas como completadas también son ingreso real del taller,
  // no solo lo vendido en la tienda.
  const appointmentRevenueRows = db
    .prepare(
      `SELECT date, SUM(amount) as total
       FROM appointments
       WHERE date BETWEEN ? AND ? AND status = 'completada' AND amount IS NOT NULL
       GROUP BY date`,
    )
    .all(fromKey, today) as { date: string; total: number }[];
  const revenueByDate = new Map<string, number>();
  for (const r of orderRevenueRows) revenueByDate.set(r.date, (revenueByDate.get(r.date) ?? 0) + r.total);
  for (const r of appointmentRevenueRows) revenueByDate.set(r.date, (revenueByDate.get(r.date) ?? 0) + r.total);
  const revenueTrend: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    revenueTrend.push(revenueByDate.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  const monthRevenue = revenueTrend.reduce((sum, v) => sum + v, 0);

  const recentOrders = listOrders().slice(0, 5);
  const upcoming = listAppointments()
    .filter((a) => a.date >= today && a.status !== "cancelada" && a.status !== "completada")
    .sort((a, b) => (a.date + a.hour).localeCompare(b.date + b.hour))
    .slice(0, 5);

  return { todayAppointments, pendingOrders, lowStock, monthRevenue, revenueTrend, recentOrders, upcoming };
}
