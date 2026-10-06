import postgres from "postgres";
import crypto from "node:crypto";
import { pointsForService } from "./services";
import { MAX_LENGTH, MAX_ORDER_LINES, MAX_QTY_PER_LINE, PHONE_ERROR, normalizePhone } from "./validation";
import { MONTHS_ES, WEEKDAYS_ES, isoDate, businessNow, addDays, addMonths, weekStart, weekdayOf, computeHoursForDate, formatHour, type WeeklyDaySchedule, type ScheduleOverride } from "./booking";

export type { WeeklyDaySchedule, ScheduleOverride };

export type AppointmentStatus = "pendiente" | "confirmada" | "en_proceso" | "completada" | "cancelada";
export type OrderStatus = "pendiente" | "pagado" | "entregado" | "cancelado";
export type PaymentMethod = "whatsapp" | "mercadopago" | "mostrador";
export type ProductCategory = "componentes" | "accesorios" | "cuidado" | "herramientas";

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
  completedAt: string | null;
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

// Por qué esta capa existe: en Vercel la función se congela entre visitas y
// la conexión cacheada puede morir mientras tanto (Supabase o la red la
// cierran y el proceso congelado no se entera). La siguiente visita escribía
// sobre ese socket muerto y nunca llegaba respuesta — los "Task timed out
// after 300 seconds" en / y /tienda. Tres defensas, en orden:
//  1. getClient() nunca reutiliza una conexión que lleva más de
//     IDLE_RECYCLE_MS sin uso: la descarta y abre otra. Esto es lo que evita
//     el cuelgue; las otras dos son red de seguridad.
//  2. Si aun así una consulta no responde en WATCHDOG_MS, se descarta ESA
//     conexión y la consulta falla rápido en vez de esperar 300s.
//  3. Las lecturas que fallan por la conexión se reintentan una vez en una
//     conexión nueva.
const IDLE_RECYCLE_MS = 5_000;
const STATEMENT_TIMEOUT_MS = 8_000;
const WATCHDOG_MS = 10_000;

type DbClient = {
  raw: postgres.Sql;
  sql: postgres.Sql;
  inFlight: number;
  lastUsedAt: number;
  dead: boolean;
};

// En dev, Next recarga este módulo en cada cambio; globalThis evita abrir
// una conexión nueva por cada recarga.
declare global {
  var __mecanicosDb: DbClient | undefined;
}

function createRawSql(): postgres.Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no está configurado.");
  // Supabase necesita SSL; un Postgres local de pruebas normalmente no lo soporta.
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  return postgres(connectionString, {
    ssl: isLocal ? false : "require",
    // Supavisor en modo transaction (puerto 6543) no soporta prepared statements.
    prepare: false,
    // Supabase recomienda 1 conexión por instancia serverless. En local
    // (next start, tests) es un solo proceso que atiende todo en paralelo.
    max: isLocal ? 10 : 1,
    // Mientras la instancia siga viva, postgres.js cierra sola la conexión
    // inactiva; si la instancia se congeló antes de eso, la descarta getClient().
    idle_timeout: IDLE_RECYCLE_MS / 1000,
    connect_timeout: 5,
    max_lifetime: 60 * 30,
    connection: {
      statement_timeout: STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: STATEMENT_TIMEOUT_MS,
    },
  });
}

class DbWatchdogTimeoutError extends Error {
  code = "WATCHDOG_TIMEOUT";
  constructor() {
    super("La base de datos no respondió a tiempo. Intenta de nuevo.");
  }
}

// Fallas de la conexión, no de la consulta: nunca confirman que la consulta
// corrió, así que reintentar un SELECT en otra conexión es seguro.
const TRANSIENT_CONNECTION_CODES = new Set([
  "WATCHDOG_TIMEOUT",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  "CONNECTION_CLOSED",
  "CONNECT_TIMEOUT",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);

function errorCode(err: unknown): string {
  if (!err || typeof err !== "object" || !("code" in err)) return "";
  return String((err as { code?: unknown }).code ?? "");
}

/**
 * Un reintento solo es inofensivo si la consulta es de lectura: si se
 * reintentara un INSERT/UPDATE que en realidad ya alcanzó a aplicarse en el
 * servidor justo antes de que la conexión muriera (y solo se perdió la
 * confirmación de vuelta), se aplicaría dos veces. Como aquí todas las
 * consultas se escriben con template strings directos (nunca se arma el SQL
 * dinámicamente), basta con mirar cómo arranca el primer fragmento.
 */
function isReadOnlyQuery(args: unknown[]): boolean {
  const strings = args[0] as { 0?: string } | undefined;
  const first = strings?.[0]?.trimStart().toUpperCase() ?? "";
  return first.startsWith("SELECT") || first.startsWith("WITH");
}

function canRetry(err: unknown, args: unknown[]): boolean {
  const code = errorCode(err);
  // CONNECT_TIMEOUT significa que la conexión nunca se abrió: la consulta no
  // llegó a enviarse, así que hasta una escritura se puede reintentar.
  if (code === "CONNECT_TIMEOUT") return true;
  return TRANSIENT_CONNECTION_CODES.has(code) && isReadOnlyQuery(args);
}

function discard(client: DbClient) {
  if (client.dead) return;
  client.dead = true;
  if (globalThis.__mecanicosDb === client) globalThis.__mecanicosDb = undefined;
  client.raw.end({ timeout: 0 }).catch(() => {});
}

function track(client: DbClient, run: () => unknown): Promise<unknown> {
  client.inFlight++;
  client.lastUsedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watchdog = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      discard(client);
      reject(new DbWatchdogTimeoutError());
    }, WATCHDOG_MS);
  });
  return Promise.race([Promise.resolve().then(run), watchdog]).finally(() => {
    clearTimeout(timer);
    client.inFlight--;
    client.lastUsedAt = Date.now();
  });
}

function wrap(client: DbClient): postgres.Sql {
  // Una función que guardó `const sql = getSql()` puede usarlo después de que
  // esa conexión fue descartada; como la consulta aún no se envía, redirigirla
  // a la conexión vigente es seguro incluso para escrituras.
  const live = () => (client.dead ? getClient() : client);
  return new Proxy(client.raw, {
    apply(_target, thisArg, args) {
      const attempt = (c: DbClient) => track(c, () => Reflect.apply(c.raw, thisArg, args));
      return attempt(live()).catch((err) => {
        if (!canRetry(err, args)) throw err;
        return attempt(getClient());
      });
    },
    get(target, prop, receiver) {
      if (prop === "begin") {
        return (...args: unknown[]) => {
          const c = live();
          return track(c, () => Reflect.apply(c.raw.begin, c.raw, args));
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as postgres.Sql;
}

function getClient(): DbClient {
  const current = globalThis.__mecanicosDb;
  if (current && !current.dead) {
    if (current.inFlight > 0 || Date.now() - current.lastUsedAt < IDLE_RECYCLE_MS) return current;
    discard(current);
  }
  const raw = createRawSql();
  const client: DbClient = { raw, sql: raw, inFlight: 0, lastUsedAt: Date.now(), dead: false };
  client.sql = wrap(client);
  globalThis.__mecanicosDb = client;
  return client;
}

function getSql(): postgres.Sql {
  return getClient().sql;
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23505");
}

// Dentro de una transacción hay que pasarle su `sql`: con una sola conexión
// (producción), usar la global esperaría a que la propia transacción la suelte.
async function nextSeq(name: string, startAt: number, sql: postgres.ISql = getSql()) {
  const rows = await sql<{ value: number }[]>`
    INSERT INTO counters (name, value) VALUES (${name}, ${startAt + 1})
    ON CONFLICT (name) DO UPDATE SET value = counters.value + 1
    RETURNING value
  `;
  return rows[0].value;
}

// ---------- Products ----------

type ProductRow = {
  id: string; name: string; category: string; description: string; price: number; stock: number; low_stock_threshold: number;
};

function rowToProduct(row: ProductRow): Product {
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

export async function listProducts(): Promise<Product[]> {
  await releaseExpiredOrders();
  const rows = await getSql()<ProductRow[]>`SELECT * FROM products ORDER BY name ASC`;
  return rows.map(rowToProduct);
}

export async function createProduct(input: Omit<Product, "id">): Promise<Product> {
  const id = `PR-${String(await nextSeq("products", 8)).padStart(2, "0")}`;
  await getSql()`
    INSERT INTO products (id, name, category, description, price, stock, low_stock_threshold)
    VALUES (${id}, ${input.name}, ${input.category}, ${input.description}, ${input.price}, ${input.stock}, ${input.lowStockThreshold})
  `;
  return { id, ...input };
}

export async function updateProduct(id: string, input: Omit<Product, "id">) {
  await getSql()`
    UPDATE products SET name=${input.name}, category=${input.category}, description=${input.description},
      price=${input.price}, stock=${input.stock}, low_stock_threshold=${input.lowStockThreshold}
    WHERE id=${id}
  `;
}

export async function deleteProduct(id: string) {
  await getSql()`DELETE FROM products WHERE id = ${id}`;
}

// ---------- Customers ----------

type CustomerRow = {
  id: string; name: string; phone: string; email: string | null; visits: number; total_spent: number; last_visit: string;
  reward_points: number; reward_lifetime: number; rewards_redeemed: number; last_reward: string | null;
};

function rowToCustomer(row: CustomerRow): Customer {
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

// Gasto, visitas y última visita no se van sumando en la fila del cliente:
// se calculan de lo que realmente pasó, con el mismo criterio que el
// dashboard y el corte. Gasto = pedidos pagados/entregados + ventas de
// mostrador + citas completadas. Visita = una cita a la que llegó (QR
// escaneado o completada) o una venta de mostrador; agendar o pedir en línea
// no es una visita. Sin visitas, "última visita" muestra su último contacto.
function selectCustomers(sql: postgres.ISql, id: string | null) {
  return sql<CustomerRow[]>`
    SELECT
      c.id, c.name, c.phone, c.email, c.reward_points, c.reward_lifetime, c.rewards_redeemed, c.last_reward,
      (COALESCE(o.spent, 0) + COALESCE(a.spent, 0))::int AS total_spent,
      (COALESCE(o.visits, 0) + COALESCE(a.visits, 0))::int AS visits,
      COALESCE(GREATEST(o.last_visit, a.last_visit), c.last_visit) AS last_visit
    FROM customers c
    LEFT JOIN (
      SELECT o.phone,
        SUM(oi.price * oi.qty)::int AS spent,
        COUNT(DISTINCT o.id) FILTER (WHERE o.payment_method = 'mostrador')::int AS visits,
        MAX(o.date) FILTER (WHERE o.payment_method = 'mostrador') AS last_visit
      FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('pagado', 'entregado')
      GROUP BY o.phone
    ) o ON o.phone = c.phone
    LEFT JOIN (
      SELECT phone,
        SUM(amount) FILTER (WHERE status = 'completada')::int AS spent,
        COUNT(*) FILTER (WHERE checked_in_at IS NOT NULL OR status IN ('en_proceso', 'completada'))::int AS visits,
        -- Fecha real de la visita: cuando llegó (checked_in_at se guarda en UTC)
        -- o cuando se completó; la agendada solo si no hay ninguna de las dos.
        MAX(COALESCE(
          GREATEST(completed_at, to_char((checked_in_at::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD')),
          date
        )) FILTER (WHERE checked_in_at IS NOT NULL OR status IN ('en_proceso', 'completada')) AS last_visit
      FROM appointments
      GROUP BY phone
    ) a ON a.phone = c.phone
    WHERE ${id}::text IS NULL OR c.id = ${id}
    ORDER BY total_spent DESC, c.name ASC
  `;
}

export async function listCustomers(): Promise<Customer[]> {
  const rows = await selectCustomers(getSql(), null);
  return rows.map(rowToCustomer);
}

// ---------- Reward catalog ----------

function rowToRewardItem(row: { id: string; name: string; points_cost: number; active: number }): RewardItem {
  return { id: row.id, name: row.name, pointsCost: row.points_cost, active: row.active === 1 };
}

export async function listRewardItems(): Promise<RewardItem[]> {
  const rows = await getSql()<{ id: string; name: string; points_cost: number; active: number }[]>`
    SELECT * FROM reward_items ORDER BY points_cost ASC
  `;
  return rows.map(rowToRewardItem);
}

export async function createRewardItem(input: { name: string; pointsCost: number }): Promise<RewardItem> {
  const id = `RW-${String(await nextSeq("reward_items", 3)).padStart(2, "0")}`;
  await getSql()`INSERT INTO reward_items (id, name, points_cost, active) VALUES (${id}, ${input.name}, ${input.pointsCost}, 1)`;
  return { id, name: input.name, pointsCost: input.pointsCost, active: true };
}

export async function updateRewardItem(id: string, input: { name: string; pointsCost: number; active: boolean }) {
  await getSql()`
    UPDATE reward_items SET name = ${input.name}, points_cost = ${input.pointsCost}, active = ${input.active ? 1 : 0}
    WHERE id = ${id}
  `;
}

export async function deleteRewardItem(id: string) {
  await getSql()`DELETE FROM reward_items WHERE id = ${id}`;
}

export class NotEnoughPointsError extends Error {}
export class RewardItemNotFoundError extends Error {}

/** Canjea una recompensa del catálogo: descuenta su costo en puntos y registra cuál fue. */
export async function redeemReward(customerId: string, rewardItemId: string): Promise<Customer> {
  const sql = getSql();
  const items = await sql<{ name: string; points_cost: number }[]>`SELECT * FROM reward_items WHERE id = ${rewardItemId}`;
  const item = items[0];
  if (!item) {
    throw new RewardItemNotFoundError("Ese premio ya no existe en el catálogo.");
  }
  // La condición de puntos suficientes va en el propio UPDATE, no en un
  // SELECT previo: si se validara con una lectura aparte, dos canjeos casi
  // simultáneos del mismo cliente podrían pasar ambos la validación con el
  // mismo saldo "viejo" y dejarlo con puntos negativos. Con la condición en
  // el WHERE, como mucho uno de los dos consigue actualizar la fila.
  const updated = await sql<{ id: string }[]>`
    UPDATE customers SET reward_points = reward_points - ${item.points_cost}, rewards_redeemed = rewards_redeemed + 1,
      last_reward = ${item.name}
    WHERE id = ${customerId} AND reward_points >= ${item.points_cost}
    RETURNING id
  `;
  if (!updated[0]) {
    throw new NotEnoughPointsError("El cliente no tiene suficientes puntos para canjear ese premio.");
  }
  const [row] = await selectCustomers(sql, customerId);
  return rowToCustomer(row);
}

/** Busca un cliente por teléfono, creándolo si hace falta, y registra su último contacto. */
async function touchCustomer(sql: postgres.ISql, name: string, phone: string, contactDate: string) {
  const existing = await sql<{ id: string }[]>`SELECT id FROM customers WHERE phone = ${phone}`;
  if (existing[0]) {
    await sql`UPDATE customers SET last_visit = ${contactDate}, name = ${name} WHERE id = ${existing[0].id}`;
    return;
  }
  const id = `CL-${String(await nextSeq("customers", 0, sql)).padStart(2, "0")}`;
  // ON CONFLICT como red de seguridad: si dos pedidos con el mismo teléfono
  // nuevo llegan casi al mismo tiempo (doble clic, dos pestañas), el SELECT
  // de arriba puede no haber visto todavía al otro. Sin esto, el segundo
  // INSERT truena por el UNIQUE de phone y se pierde todo ese pedido — así
  // se degrada a lo mismo que hubiera hecho el camino de "ya existe".
  await sql`
    INSERT INTO customers (id, name, phone, email, visits, total_spent, last_visit)
    VALUES (${id}, ${name}, ${phone}, NULL, 0, 0, ${contactDate})
    ON CONFLICT (phone) DO UPDATE SET last_visit = ${contactDate}, name = ${name}
  `;
}

// ---------- Límite de intentos ----------

/**
 * Cuenta un intento para `key` (p. ej. "login:<ip>") en una ventana fija de
 * `windowSeconds` y dice si todavía está dentro de `limit`. Vive en Postgres
 * y no en memoria porque en Vercel cada petición puede caer en una instancia
 * distinta. Si la tabla no existe todavía (falta correr el SQL) o la consulta
 * falla, deja pasar: el límite protege, pero nunca debe tumbar el sitio.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const sql = getSql();
    const rows = await sql<{ hits: number }[]>`
      INSERT INTO rate_limits (key, window_start, hits) VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN rate_limits.window_start < now() - ${windowSeconds} * interval '1 second'
                    THEN 1 ELSE rate_limits.hits + 1 END,
        window_start = CASE WHEN rate_limits.window_start < now() - ${windowSeconds} * interval '1 second'
                    THEN now() ELSE rate_limits.window_start END
      RETURNING hits
    `;
    // Limpieza ocasional para que la tabla no crezca sin fin.
    if (Math.random() < 0.02) {
      await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
    }
    return rows[0].hits <= limit;
  } catch (err) {
    console.error("rate limit no disponible, se deja pasar:", errorCode(err));
    return true;
  }
}

// ---------- Testimonios ----------

type TestimonialRow = {
  id: string; name: string; role: string | null; quote: string; stars: number; status: string; created_at: string;
};

function rowToTestimonial(row: TestimonialRow): Testimonial {
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

export async function listApprovedTestimonials(): Promise<Testimonial[]> {
  const rows = await getSql()<TestimonialRow[]>`
    SELECT * FROM testimonials WHERE status = 'aprobado' ORDER BY created_at DESC
  `;
  return rows.map(rowToTestimonial);
}

export async function listTestimonials(): Promise<Testimonial[]> {
  const rows = await getSql()<TestimonialRow[]>`SELECT * FROM testimonials ORDER BY created_at DESC`;
  return rows.map(rowToTestimonial);
}

export class InvalidTestimonialError extends Error {}

export async function createTestimonial(input: { name: string; role: string | null; quote: string; stars: number }): Promise<Testimonial> {
  const name = String(input.name ?? "").trim();
  const quote = String(input.quote ?? "").trim();
  if (!name) throw new InvalidTestimonialError("Tu nombre es obligatorio.");
  if (!quote) throw new InvalidTestimonialError("Escribe tu testimonio.");
  if (name.length > MAX_LENGTH.name) throw new InvalidTestimonialError("El nombre es demasiado largo.");
  if (quote.length > MAX_LENGTH.testimonialQuote) {
    throw new InvalidTestimonialError(`El testimonio no puede pasar de ${MAX_LENGTH.testimonialQuote} caracteres.`);
  }
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5) {
    throw new InvalidTestimonialError("La calificación debe ser de 1 a 5 estrellas.");
  }
  const id = `TM-${String(await nextSeq("testimonials", 3)).padStart(2, "0")}`;
  const role = String(input.role ?? "").trim() || null;
  if (role && role.length > MAX_LENGTH.testimonialRole) throw new InvalidTestimonialError("El campo de bici/rol es demasiado largo.");
  await getSql()`
    INSERT INTO testimonials (id, name, role, quote, stars, status) VALUES (${id}, ${name}, ${role}, ${quote}, ${input.stars}, 'pendiente')
  `;
  return { id, name, role, quote, stars: input.stars, status: "pendiente", createdAt: new Date().toISOString() };
}

export async function updateTestimonialStatus(id: string, status: TestimonialStatus) {
  await getSql()`UPDATE testimonials SET status = ${status} WHERE id = ${id}`;
}

export async function deleteTestimonial(id: string) {
  await getSql()`DELETE FROM testimonials WHERE id = ${id}`;
}

// ---------- Segunda mano ----------

type SecondHandRow = {
  id: string; name: string; description: string; price: number; condition: string;
  image_path: string | null; status: string; created_at: string;
};

function rowToSecondHandItem(row: SecondHandRow): SecondHandItem {
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

export async function listAvailableSecondHandItems(): Promise<SecondHandItem[]> {
  const rows = await getSql()<SecondHandRow[]>`
    SELECT * FROM secondhand_items WHERE status = 'disponible' ORDER BY created_at DESC
  `;
  return rows.map(rowToSecondHandItem);
}

export async function listSecondHandItems(): Promise<SecondHandItem[]> {
  const rows = await getSql()<SecondHandRow[]>`SELECT * FROM secondhand_items ORDER BY created_at DESC`;
  return rows.map(rowToSecondHandItem);
}

export class InvalidSecondHandItemError extends Error {}

function sanitizeSecondHandInput(input: { name: string; description: string; price: number; condition: string }) {
  const name = input.name.trim();
  if (!name) throw new InvalidSecondHandItemError("El nombre de la pieza es obligatorio.");
  if (!Number.isFinite(input.price) || input.price < 0) throw new InvalidSecondHandItemError("El precio debe ser 0 o mayor.");
  return { ...input, name, description: input.description.trim(), condition: input.condition.trim() };
}

export async function createSecondHandItem(input: {
  name: string;
  description: string;
  price: number;
  condition: string;
  imagePath: string | null;
}): Promise<SecondHandItem> {
  const clean = sanitizeSecondHandInput(input);
  const id = `SH-${String(await nextSeq("secondhand_items", 0)).padStart(2, "0")}`;
  await getSql()`
    INSERT INTO secondhand_items (id, name, description, price, condition, image_path, status)
    VALUES (${id}, ${clean.name}, ${clean.description}, ${clean.price}, ${clean.condition}, ${input.imagePath}, 'disponible')
  `;
  return { id, ...clean, imagePath: input.imagePath, status: "disponible", createdAt: new Date().toISOString() };
}

export async function updateSecondHandItem(
  id: string,
  input: { name: string; description: string; price: number; condition: string; imagePath: string | null },
): Promise<void> {
  const clean = sanitizeSecondHandInput(input);
  await getSql()`
    UPDATE secondhand_items SET name=${clean.name}, description=${clean.description}, price=${clean.price},
      condition=${clean.condition}, image_path=${input.imagePath}
    WHERE id=${id}
  `;
}

export async function updateSecondHandStatus(id: string, status: SecondHandStatus) {
  await getSql()`UPDATE secondhand_items SET status = ${status} WHERE id = ${id}`;
}

export async function deleteSecondHandItem(id: string): Promise<SecondHandItem | null> {
  const rows = await getSql()<SecondHandRow[]>`SELECT * FROM secondhand_items WHERE id = ${id}`;
  const existing = rows[0];
  if (!existing) return null;
  await getSql()`DELETE FROM secondhand_items WHERE id = ${id}`;
  return rowToSecondHandItem(existing);
}

// ---------- Horario ----------

function rowToWeeklyDay(row: { day_of_week: number; is_open: number; open_hour: number; close_hour: number }): WeeklyDaySchedule {
  return { dayOfWeek: row.day_of_week, isOpen: row.is_open === 1, openHour: row.open_hour, closeHour: row.close_hour };
}

function rowToOverride(row: { date: string; closed: number; open_hour: number | null; close_hour: number | null; note: string | null }): ScheduleOverride {
  return { date: row.date, closed: row.closed === 1, openHour: row.open_hour, closeHour: row.close_hour, note: row.note };
}

export async function getWeeklySchedule(): Promise<WeeklyDaySchedule[]> {
  const rows = await getSql()<{ day_of_week: number; is_open: number; open_hour: number; close_hour: number }[]>`
    SELECT * FROM weekly_schedule ORDER BY day_of_week ASC
  `;
  return rows.map(rowToWeeklyDay);
}

export class InvalidScheduleError extends Error {}

export async function updateWeeklySchedule(days: WeeklyDaySchedule[]) {
  for (const day of days) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) throw new InvalidScheduleError("Día de la semana inválido.");
    if (!Number.isInteger(day.openHour) || !Number.isInteger(day.closeHour) || day.openHour < 0 || day.closeHour > 23) {
      throw new InvalidScheduleError("Las horas deben ser enteros entre 0 y 23.");
    }
    if (day.isOpen && day.openHour > day.closeHour) {
      throw new InvalidScheduleError("La hora de apertura no puede ser después de la hora de cierre.");
    }
  }
  await getSql().begin(async (sql) => {
    for (const day of days) {
      await sql`
        UPDATE weekly_schedule SET is_open = ${day.isOpen ? 1 : 0}, open_hour = ${day.openHour}, close_hour = ${day.closeHour}
        WHERE day_of_week = ${day.dayOfWeek}
      `;
    }
  });
}

export async function getScheduleOverride(date: string): Promise<ScheduleOverride | null> {
  const rows = await getSql()<{ date: string; closed: number; open_hour: number | null; close_hour: number | null; note: string | null }[]>`
    SELECT * FROM schedule_overrides WHERE date = ${date}
  `;
  return rows[0] ? rowToOverride(rows[0]) : null;
}

export async function listScheduleOverrides(): Promise<ScheduleOverride[]> {
  const rows = await getSql()<{ date: string; closed: number; open_hour: number | null; close_hour: number | null; note: string | null }[]>`
    SELECT * FROM schedule_overrides ORDER BY date ASC
  `;
  return rows.map(rowToOverride);
}

export async function listScheduleOverridesInRange(from: string, to: string): Promise<ScheduleOverride[]> {
  const rows = await getSql()<{ date: string; closed: number; open_hour: number | null; close_hour: number | null; note: string | null }[]>`
    SELECT * FROM schedule_overrides WHERE date BETWEEN ${from} AND ${to} ORDER BY date ASC
  `;
  return rows.map(rowToOverride);
}

export async function upsertScheduleOverride(input: {
  date: string;
  closed: boolean;
  openHour: number | null;
  closeHour: number | null;
  note: string | null;
}): Promise<ScheduleOverride> {
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
  const closed = input.closed ? 1 : 0;
  const openHour = input.closed ? null : input.openHour;
  const closeHour = input.closed ? null : input.closeHour;
  const note = input.note?.trim() || null;
  const rows = await getSql()<{ date: string; closed: number; open_hour: number | null; close_hour: number | null; note: string | null }[]>`
    INSERT INTO schedule_overrides (date, closed, open_hour, close_hour, note) VALUES (${input.date}, ${closed}, ${openHour}, ${closeHour}, ${note})
    ON CONFLICT (date) DO UPDATE SET closed = ${closed}, open_hour = ${openHour}, close_hour = ${closeHour}, note = ${note}
    RETURNING *
  `;
  return rowToOverride(rows[0]);
}

export async function deleteScheduleOverride(date: string) {
  await getSql()`DELETE FROM schedule_overrides WHERE date = ${date}`;
}

// ---------- Appointments ----------

type AppointmentRow = {
  id: string; qr_token: string; customer: string; phone: string; service: string; date: string; hour: string;
  status: string; checked_in_at: string | null; notes: string | null; amount: number | null;
  completed_at: string | null;
};

function rowToAppointment(row: AppointmentRow): Appointment {
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
    completedAt: row.completed_at,
  };
}

export async function listAppointments(): Promise<Appointment[]> {
  const rows = await getSql()<AppointmentRow[]>`SELECT * FROM appointments ORDER BY date DESC, hour DESC`;
  return rows.map(rowToAppointment);
}

export async function getAppointmentByToken(token: string): Promise<Appointment | null> {
  const rows = await getSql()<AppointmentRow[]>`SELECT * FROM appointments WHERE qr_token = ${token}`;
  return rows[0] ? rowToAppointment(rows[0]) : null;
}

/** Horas ocupadas por fecha (yyyy-mm-dd) dentro de [from, to], sin contar citas canceladas. */
export async function getBusyHoursInRange(from: string, to: string): Promise<Record<string, string[]>> {
  const rows = await getSql()<{ date: string; hour: string }[]>`
    SELECT date, hour FROM appointments WHERE date BETWEEN ${from} AND ${to} AND status != 'cancelada'
  `;
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    (map[row.date] ??= []).push(row.hour);
  }
  return map;
}

export class SlotTakenError extends Error {}
export class InvalidAppointmentError extends Error {}

const MAX_UPCOMING_PER_PHONE = 2;

/** Reglas de negocio del horario — el front ya las respeta, pero el server las vuelve a exigir. */
async function assertValidSlot(dateKey: string, hour: string, { blockPastHourToday = false } = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new InvalidAppointmentError("Fecha inválida.");
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (isoDate(date) !== dateKey) throw new InvalidAppointmentError("Fecha inválida.");
  const now = businessNow();
  if (dateKey < now.dateKey) {
    throw new InvalidAppointmentError("No se pueden agendar citas en fechas pasadas.");
  }
  // El calendario público ya oculta las horas de hoy que ya pasaron, pero
  // esa es solo una ayuda visual — sin este chequeo, pedir el booking
  // directamente permitía agendar una cita a una hora de hoy que ya pasó,
  // porque computeHoursForDate solo mira el horario del local, no la hora
  // actual. Solo aplica a citas nuevas: el panel de reagendado SÍ deja
  // elegir una hora ya pasada de hoy a propósito (para corregir el registro
  // de una cita que ya se atendió), y eso no es un bug.
  if (blockPastHourToday && dateKey === now.dateKey && Number(hour.slice(0, 2)) <= now.hour) {
    throw new InvalidAppointmentError("Ese horario ya pasó.");
  }
  const [weekly, override] = await Promise.all([getWeeklySchedule(), getScheduleOverride(dateKey)]);
  const hours = computeHoursForDate(date, weekly, override ? { [dateKey]: override } : {});
  if (!hours.map(formatHour).includes(hour)) {
    throw new InvalidAppointmentError("Ese horario no está disponible.");
  }
}

export async function createAppointment(input: {
  customer: string;
  phone: string;
  service: string;
  date: string;
  hour: string;
}): Promise<Appointment> {
  const customer = String(input.customer ?? "").trim();
  const service = String(input.service ?? "").trim();
  if (!customer || !service) {
    throw new InvalidAppointmentError("Nombre, teléfono y servicio son obligatorios.");
  }
  if (customer.length > MAX_LENGTH.name) throw new InvalidAppointmentError("El nombre es demasiado largo.");
  if (service.length > MAX_LENGTH.service) throw new InvalidAppointmentError("La descripción del servicio es demasiado larga.");
  const phone = normalizePhone(String(input.phone ?? ""));
  if (!phone) throw new InvalidAppointmentError(PHONE_ERROR);
  await assertValidSlot(String(input.date), String(input.hour), { blockPastHourToday: true });

  const sql = getSql();
  // Un mismo teléfono no puede apartar más de MAX_UPCOMING_PER_PHONE citas a
  // futuro: sin esto, un bot llenaba todos los horarios de un día.
  const upcoming = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM appointments
    WHERE phone = ${phone} AND status IN ('pendiente', 'confirmada') AND date >= ${businessNow().dateKey}
  `;
  if (upcoming[0].n >= MAX_UPCOMING_PER_PHONE) {
    throw new InvalidAppointmentError(
      `Ya tienes ${MAX_UPCOMING_PER_PHONE} citas próximas con este teléfono. Si necesitas otra, escríbenos por WhatsApp.`,
    );
  }
  const id = `C-${await nextSeq("appointments", 1049)}`;
  const qrToken = crypto.randomUUID();
  try {
    await sql`
      INSERT INTO appointments (id, qr_token, customer, phone, service, date, hour, status)
      VALUES (${id}, ${qrToken}, ${customer}, ${phone}, ${service}, ${input.date}, ${input.hour}, 'pendiente')
    `;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlotTakenError("Ese horario ya fue tomado.");
    throw err;
  }
  await touchCustomer(sql, customer, phone, businessNow().dateKey);
  return { id, qrToken, customer, phone, service, date: input.date, hour: input.hour, status: "pendiente", checkedInAt: null, notes: null, amount: null, completedAt: null };
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const rows = await getSql()<AppointmentRow[]>`SELECT * FROM appointments WHERE id = ${id}`;
  return rows[0] ? rowToAppointment(rows[0]) : null;
}

/** Mueve una cita a otra fecha/hora, respetando el mismo horario configurado que valida las citas nuevas. */
export async function rescheduleAppointment(id: string, date: string, hour: string): Promise<Appointment> {
  const current = await getAppointment(id);
  if (!current) throw new InvalidAppointmentError("La cita no existe.");
  await assertValidSlot(date, hour);
  try {
    // RETURNING evita la segunda vuelta a la base que había antes solo para
    // releer la fila que se acaba de actualizar.
    const rows = await getSql()<AppointmentRow[]>`
      UPDATE appointments SET date = ${date}, hour = ${hour} WHERE id = ${id} RETURNING *
    `;
    return rowToAppointment(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlotTakenError("Ese horario ya fue tomado.");
    throw err;
  }
}

export class InvalidStatusError extends Error {}
export class AmountRequiredError extends Error {}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, amount?: number) {
  if (!APPOINTMENT_STATUSES.includes(status)) {
    throw new InvalidStatusError("Estado de cita inválido.");
  }
  const sql = getSql();
  const currentRows = await sql<{ status: AppointmentStatus; phone: string; service: string }[]>`
    SELECT status, phone, service FROM appointments WHERE id = ${id}
  `;
  const current = currentRows[0];
  const becomesCompleted = Boolean(current) && status === "completada" && current!.status !== "completada";
  if (becomesCompleted) {
    if (amount === undefined || !Number.isFinite(amount) || amount < 0) {
      throw new AmountRequiredError("Indica cuánto se cobró por el servicio para marcarlo como completado.");
    }
  }
  await sql.begin(async (sql) => {
    if (becomesCompleted) {
      // El dinero cuenta el día en que se cobra, que puede no ser el día agendado.
      await sql`
        UPDATE appointments SET status = ${status}, amount = ${Math.round(amount!)}, completed_at = ${businessNow().dateKey}
        WHERE id = ${id}
      `;
    } else {
      await sql`UPDATE appointments SET status = ${status} WHERE id = ${id}`;
    }
    // Puntos de recompensa según el tipo de servicio, al marcarlo completado,
    // solo una vez (no vuelve a sumar si el estado ya estaba en completada).
    if (current && becomesCompleted) {
      const points = pointsForService(current.service);
      await sql`
        UPDATE customers SET reward_points = reward_points + ${points}, reward_lifetime = reward_lifetime + ${points}
        WHERE phone = ${current.phone}
      `;
    }
  });
}

export async function checkInAppointment(token: string): Promise<Appointment | null> {
  const appt = await getAppointmentByToken(token);
  if (!appt) return null;
  const nextStatus: AppointmentStatus =
    appt.status === "pendiente" || appt.status === "confirmada" ? "en_proceso" : appt.status;
  const rows = await getSql()<AppointmentRow[]>`
    UPDATE appointments SET checked_in_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS'), status = ${nextStatus}
    WHERE qr_token = ${token}
    RETURNING *
  `;
  return rows[0] ? rowToAppointment(rows[0]) : null;
}

// ---------- Orders ----------

type OrderRow = {
  id: string; customer: string; phone: string; status: string; payment_method: string; mp_payment_id: string | null; date: string;
};

type OrderAggRow = OrderRow & { items: OrderItem[] | null };

function rowsToOrder(orderRow: OrderRow, itemRows: OrderItem[]): Order {
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

/** Un solo JOIN + json_agg en vez de una consulta de order_items por cada pedido (N+1). */
export async function listOrders(): Promise<Order[]> {
  await releaseExpiredOrders();
  const rows = await getSql()<OrderAggRow[]>`
    SELECT o.*, COALESCE(
      json_agg(json_build_object('name', oi.name, 'price', oi.price, 'qty', oi.qty) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),
      '[]'
    ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  return rows.map((row) => rowsToOrder(row, row.items ?? []));
}

export async function getOrder(id: string): Promise<Order | null> {
  const rows = await getSql()<OrderAggRow[]>`
    SELECT o.*, COALESCE(
      json_agg(json_build_object('name', oi.name, 'price', oi.price, 'qty', oi.qty) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),
      '[]'
    ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ${id}
    GROUP BY o.id
  `;
  const row = rows[0];
  return row ? rowsToOrder(row, row.items ?? []) : null;
}

/** Pedido para su página pública, por su clave secreta (nunca por folio). */
export async function getOrderByPublicToken(token: string): Promise<Order | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const rows = await getSql()<{ id: string }[]>`SELECT id FROM orders WHERE public_token = ${token}`;
  return rows[0] ? getOrder(rows[0].id) : null;
}

export class InvalidOrderError extends Error {}
export class ProductNotFoundError extends Error {}

const MAX_PENDING_ORDERS_PER_PHONE = 2;

// Cuánto tiempo aparta inventario un pedido sin pagar antes de cancelarse
// solo. Mercado Pago: el link de pago vence a la hora (ver mercadopago.ts),
// así que después ya no se puede pagar. WhatsApp: dos días para que el
// taller confirme y cobre; si para entonces sigue "pendiente", se libera.
export const ORDER_HOLD_HOURS = { mercadopago: 1, whatsapp: 48 } as const;
const RELEASE_INTERVAL_MS = 60_000;
let lastReleaseAt = 0;

/**
 * Cancela los pedidos pendientes que ya pasaron su tiempo de apartado y
 * regresa su stock, en una sola sentencia (el UPDATE bloquea cada pedido,
 * así que dos llamadas simultáneas nunca devuelven el mismo stock dos veces).
 * No hay cron: se llama al cargar la tienda, el panel y al crear pedidos, y
 * como mucho una vez por minuto por instancia salvo con `force`.
 */
export async function releaseExpiredOrders({ force = false } = {}) {
  if (!force && Date.now() - lastReleaseAt < RELEASE_INTERVAL_MS) return;
  lastReleaseAt = Date.now();
  try {
    await getSql()`
    WITH expired AS (
      UPDATE orders SET status = 'cancelado'
      WHERE status = 'pendiente' AND (
        (payment_method = 'mercadopago'
          AND created_at < to_char((now() AT TIME ZONE 'utc') - ${ORDER_HOLD_HOURS.mercadopago} * interval '1 hour', 'YYYY-MM-DD HH24:MI:SS'))
        OR (payment_method = 'whatsapp'
          AND created_at < to_char((now() AT TIME ZONE 'utc') - ${ORDER_HOLD_HOURS.whatsapp} * interval '1 hour', 'YYYY-MM-DD HH24:MI:SS'))
      )
      RETURNING id
    )
    UPDATE products p SET stock = p.stock + agg.qty
    FROM (
      SELECT name, SUM(qty)::int AS qty FROM order_items
      WHERE order_id IN (SELECT id FROM expired) GROUP BY name
    ) agg
    WHERE p.name = agg.name
  `;
  } catch (err) {
    // Es mantenimiento: si falla, la página que lo llamó debe cargar igual.
    console.error("no se pudieron liberar pedidos vencidos:", errorCode(err));
  }
}

/** Vuelve a apartar el stock de un pedido que estaba cancelado (sin bajar de 0). */
async function reserveStockAgain(sql: postgres.ISql, orderId: string) {
  await sql`
    UPDATE products p SET stock = GREATEST(p.stock - agg.qty, 0)
    FROM (SELECT name, SUM(qty)::int AS qty FROM order_items WHERE order_id = ${orderId} GROUP BY name) agg
    WHERE agg.name = p.name
  `;
}

export async function createOrder(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number }[];
  paymentMethod: PaymentMethod;
}): Promise<Order & { publicToken: string }> {
  const customer = String(input.customer ?? "").trim();
  if (!customer) throw new InvalidOrderError("Nombre y teléfono son obligatorios.");
  if (customer.length > MAX_LENGTH.name) throw new InvalidOrderError("El nombre es demasiado largo.");
  const phone = normalizePhone(String(input.phone ?? ""));
  if (!phone) throw new InvalidOrderError(PHONE_ERROR);
  if (!Array.isArray(input.items) || input.items.length === 0) throw new InvalidOrderError("El pedido no tiene productos.");
  if (input.items.length > MAX_ORDER_LINES) throw new InvalidOrderError("El pedido tiene demasiados productos.");
  for (const item of input.items) {
    if (typeof item.name !== "string" || item.name.length > MAX_LENGTH.orderItemName) {
      throw new InvalidOrderError("Producto inválido.");
    }
    if (!Number.isInteger(item.qty) || item.qty <= 0 || item.qty > MAX_QTY_PER_LINE) {
      throw new InvalidOrderError(`Cantidad inválida para "${item.name}".`);
    }
  }

  // Libera primero el stock de pedidos abandonados, para no rechazar este
  // pedido por piezas que en realidad ya nadie va a pagar.
  await releaseExpiredOrders({ force: true });

  const sql = getSql();
  // Un teléfono no puede tener más de MAX_PENDING_ORDERS_PER_PHONE pedidos
  // sin pagar a la vez: cada pedido aparta inventario, y sin este tope
  // cualquiera podía dejar la tienda en "agotado" sin pagar nada.
  const pending = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM orders WHERE phone = ${phone} AND status = 'pendiente'
  `;
  if (pending[0].n >= MAX_PENDING_ORDERS_PER_PHONE) {
    throw new InvalidOrderError(
      "Ya tienes pedidos pendientes de pago con este teléfono. Termina o cancela alguno, o escríbenos por WhatsApp.",
    );
  }
  const id = `P-${await nextSeq("orders", 3305)}`;
  // El precio SIEMPRE se toma de la base de datos, nunca de lo que mande el
  // navegador — así el cliente no puede decidir cuánto paga. Un solo SELECT
  // con todos los nombres en vez de uno por producto (N+1) para no agregar
  // una vuelta extra a la base por cada cosa que lleve el carrito.
  const names = input.items.map((i) => i.name);
  const products = await sql<{ name: string; price: number; stock: number }[]>`
    SELECT * FROM products WHERE name = ANY(${names})
  `;
  const productByName = new Map(products.map((p) => [p.name, p]));
  const pricedItems: OrderItem[] = [];
  for (const item of input.items) {
    const product = productByName.get(item.name);
    if (!product) throw new ProductNotFoundError(`"${item.name}" ya no está disponible.`);
    if (product.stock < item.qty) throw new InvalidOrderError(`No hay suficiente stock de "${item.name}".`);
    pricedItems.push({ name: product.name, price: product.price, qty: item.qty });
  }
  const date = businessNow().dateKey;
  // Clave de la página pública del pedido (/pedido/<clave>). El folio P-####
  // es consecutivo: si la página se abriera con él, cualquiera podía ver
  // todos los pedidos probando números.
  const publicToken = crypto.randomUUID();

  // Un INSERT multi-fila y un solo UPDATE (agrupando cantidades por
  // producto, por si el carrito trae el mismo artículo en más de una línea)
  // en vez de dos consultas por cada producto del carrito.
  const stockByName = new Map<string, number>();
  for (const item of pricedItems) stockByName.set(item.name, (stockByName.get(item.name) ?? 0) + item.qty);
  const stockNames = [...stockByName.keys()];
  const stockQtys = stockNames.map((n) => stockByName.get(n)!);

  await sql.begin(async (sql) => {
    await sql`
      INSERT INTO orders (id, customer, phone, status, payment_method, date, public_token)
      VALUES (${id}, ${customer}, ${phone}, 'pendiente', ${input.paymentMethod}, ${date}, ${publicToken})
    `;
    await sql`
      INSERT INTO order_items (order_id, name, price, qty)
      SELECT ${id}, * FROM unnest(${pricedItems.map((i) => i.name)}::text[], ${pricedItems.map((i) => i.price)}::int[], ${pricedItems.map((i) => i.qty)}::int[])
    `;
    // El SELECT de stock de arriba ya filtró lo obvio, pero entre esa lectura
    // y este UPDATE puede haber entrado otro pedido por el mismo producto —
    // por eso la condición de stock suficiente va en el propio WHERE (igual
    // que en redeemReward) y no en un chequeo aparte: así, si dos pedidos por
    // la última pieza llegan casi al mismo tiempo, como mucho uno logra
    // descontarla y el otro revierte toda la transacción.
    const updated = await sql<{ name: string }[]>`
      UPDATE products p SET stock = p.stock - x.qty
      FROM unnest(${stockNames}::text[], ${stockQtys}::int[]) AS x(name, qty)
      WHERE p.name = x.name AND p.stock >= x.qty
      RETURNING p.name
    `;
    if (updated.length !== stockNames.length) {
      const ok = new Set(updated.map((r) => r.name));
      const missing = stockNames.find((n) => !ok.has(n))!;
      throw new InvalidOrderError(`No hay suficiente stock de "${missing}".`);
    }
    await touchCustomer(sql, customer, phone, date);
  });
  return { id, customer, phone, items: pricedItems, paymentMethod: input.paymentMethod, status: "pendiente", mpPaymentId: null, date, publicToken };
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
export async function createManualSale(input: {
  customer: string;
  phone: string;
  items: { name: string; qty: number; price: number }[];
}): Promise<Order> {
  const customer = input.customer.trim();
  if (!customer || !input.phone.trim()) throw new InvalidOrderError("Nombre y teléfono son obligatorios.");
  // Mismo formato que las citas y la tienda (10 dígitos), para que la venta
  // caiga en el mismo cliente aunque se escriba con guiones o espacios.
  const phone = normalizePhone(input.phone);
  if (!phone) throw new InvalidOrderError(PHONE_ERROR);
  if (input.items.length === 0) throw new InvalidOrderError("La venta no tiene conceptos.");

  const sql = getSql();
  const id = `P-${await nextSeq("orders", 3305)}`;
  const names: string[] = [];
  for (const item of input.items) {
    const name = item.name.trim();
    if (!name) throw new InvalidOrderError("Cada concepto necesita un nombre.");
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw new InvalidOrderError(`Cantidad inválida para "${name}".`);
    }
    if (!Number.isFinite(item.price) || item.price < 0) {
      throw new InvalidOrderError(`Precio inválido para "${name}".`);
    }
    names.push(name);
  }
  const products = await sql<{ name: string; stock: number }[]>`SELECT name, stock FROM products WHERE name = ANY(${names})`;
  const stockByName = new Map(products.map((p) => [p.name, p.stock]));
  const pricedItems: OrderItem[] = [];
  for (const item of input.items) {
    const name = item.name.trim();
    const stock = stockByName.get(name);
    if (stock !== undefined && stock < item.qty) throw new InvalidOrderError(`No hay suficiente stock de "${name}".`);
    pricedItems.push({ name, price: item.price, qty: item.qty });
  }
  const date = businessNow().dateKey;

  // Igual que en createOrder: un INSERT multi-fila y un solo UPDATE
  // agrupado, en vez de dos consultas por cada concepto de la venta. Solo se
  // agrupan los conceptos que sí son un producto real del catálogo — uno
  // libre (ej. mano de obra) no está en stockByName y no debe intentar
  // descontar inventario de nada.
  const decrementByName = new Map<string, number>();
  for (const item of pricedItems) {
    if (!stockByName.has(item.name)) continue;
    decrementByName.set(item.name, (decrementByName.get(item.name) ?? 0) + item.qty);
  }
  const decrementNames = [...decrementByName.keys()];
  const decrementQtys = decrementNames.map((n) => decrementByName.get(n)!);

  await sql.begin(async (sql) => {
    await sql`INSERT INTO orders (id, customer, phone, status, payment_method, date) VALUES (${id}, ${customer}, ${phone}, 'pagado', 'mostrador', ${date})`;
    await sql`
      INSERT INTO order_items (order_id, name, price, qty)
      SELECT ${id}, * FROM unnest(${pricedItems.map((i) => i.name)}::text[], ${pricedItems.map((i) => i.price)}::int[], ${pricedItems.map((i) => i.qty)}::int[])
    `;
    if (decrementNames.length > 0) {
      // Misma condición de carrera que en createOrder: el stock suficiente
      // se exige en el WHERE del UPDATE, no en una lectura previa aparte.
      const updated = await sql<{ name: string }[]>`
        UPDATE products p SET stock = p.stock - x.qty
        FROM unnest(${decrementNames}::text[], ${decrementQtys}::int[]) AS x(name, qty)
        WHERE p.name = x.name AND p.stock >= x.qty
        RETURNING p.name
      `;
      if (updated.length !== decrementNames.length) {
        const ok = new Set(updated.map((r) => r.name));
        const missing = decrementNames.find((n) => !ok.has(n))!;
        throw new InvalidOrderError(`No hay suficiente stock de "${missing}".`);
      }
    }
    await touchCustomer(sql, customer, phone, date);
  });
  return { id, customer, phone, items: pricedItems, paymentMethod: "mostrador", status: "pagado", mpPaymentId: null, date };
}

/** Pedidos dentro de un rango de fechas [from, to], para el corte de caja. */
export async function listOrdersInRange(from: string, to: string): Promise<Order[]> {
  const rows = await getSql()<OrderAggRow[]>`
    SELECT o.*, COALESCE(
      json_agg(json_build_object('name', oi.name, 'price', oi.price, 'qty', oi.qty) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),
      '[]'
    ) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.date BETWEEN ${from} AND ${to}
    GROUP BY o.id
    ORDER BY o.date ASC, o.created_at ASC
  `;
  return rows.map((row) => rowsToOrder(row, row.items ?? []));
}

/** Citas completadas con monto cobrado dentro de [from, to], para el corte de caja. */
export async function listCompletedAppointmentsInRange(from: string, to: string): Promise<Appointment[]> {
  const rows = await getSql()<AppointmentRow[]>`
    SELECT * FROM appointments
    WHERE COALESCE(completed_at, date) BETWEEN ${from} AND ${to} AND status = 'completada' AND amount IS NOT NULL
    ORDER BY COALESCE(completed_at, date) ASC, hour ASC
  `;
  return rows.map(rowToAppointment);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new InvalidStatusError("Estado de pedido inválido.");
  }
  const sql = getSql();
  const currentRows = await sql<{ status: OrderStatus }[]>`SELECT status FROM orders WHERE id = ${id}`;
  const current = currentRows[0];
  await sql.begin(async (sql) => {
    await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
    // Cancelar libera el inventario que se había reservado al crear el
    // pedido — un solo UPDATE con JOIN en vez de un SELECT y un UPDATE por
    // cada producto del pedido.
    // Reactivar un pedido cancelado vuelve a apartar su stock; antes se
    // quedaba devuelto y el inventario terminaba inflado.
    if (current?.status === "cancelado" && status !== "cancelado") {
      await reserveStockAgain(sql, id);
    }
    if (status === "cancelado" && current?.status !== "cancelado") {
      // Se agrupa por nombre antes del JOIN: si el pedido tiene el mismo
      // producto en más de una línea, un UPDATE...FROM sin agrupar solo
      // aplicaría una de esas líneas por fila de destino, no la suma.
      await sql`
        UPDATE products p SET stock = p.stock + agg.qty
        FROM (SELECT name, SUM(qty) as qty FROM order_items WHERE order_id = ${id} GROUP BY name) agg
        WHERE agg.name = p.name
      `;
    }
  });
}

export async function setOrderPreference(id: string, preferenceId: string) {
  await getSql()`UPDATE orders SET mp_preference_id = ${preferenceId} WHERE id = ${id}`;
}

export async function markOrderPaid(orderId: string, paymentId: string): Promise<Order | null> {
  const sql = getSql();
  // Si el pedido se canceló solo por tiempo (releaseExpiredOrders) y el pago
  // llegó justo después, se marca pagado y se vuelve a apartar su stock.
  const row = await sql.begin(async (sql) => {
    const before = await sql<{ status: string }[]>`SELECT status FROM orders WHERE id = ${orderId} FOR UPDATE`;
    if (!before[0]) return null;
    if (before[0].status === "cancelado") await reserveStockAgain(sql, orderId);
    const updated = await sql<OrderRow[]>`
      UPDATE orders SET status = 'pagado', mp_payment_id = ${paymentId} WHERE id = ${orderId} RETURNING *
    `;
    return updated[0];
  });
  if (!row) return null;
  const items = await sql<OrderItem[]>`SELECT name, price, qty FROM order_items WHERE order_id = ${orderId} ORDER BY id`;
  return rowsToOrder(row, items);
}

export { orderTotal } from "./pricing";

// ---------- Dashboard ----------

export type RevenueBucket = { label: string; detail: string; total: number };
export type RevenueGranularity = "day" | "week" | "month";
export type RevenueSeries = Record<RevenueGranularity, RevenueBucket[]>;

const MONTHS_SHORT = MONTHS_ES.map((m) => m.slice(0, 3));

function shortDate(dateKey: string) {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/** Ingresos agrupados por día (14), semana (12, de lunes a domingo) y mes (12). */
function buildRevenueSeries(today: string, revenueByDate: Map<string, number>): RevenueSeries {
  const sumBetween = (from: string, to: string) => {
    let total = 0;
    for (const [date, value] of revenueByDate) if (date >= from && date <= to) total += value;
    return total;
  };

  const day: RevenueBucket[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = addDays(today, -i);
    const [, m, d] = key.split("-").map(Number);
    const weekday = WEEKDAYS_ES[weekdayOf(key)];
    day.push({
      label: shortDate(key),
      detail: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d} de ${MONTHS_ES[m - 1]}`,
      total: revenueByDate.get(key) ?? 0,
    });
  }

  const week: RevenueBucket[] = [];
  const currentWeek = weekStart(today);
  for (let i = 11; i >= 0; i--) {
    const start = addDays(currentWeek, -7 * i);
    const end = addDays(start, 6);
    week.push({
      label: shortDate(start),
      detail: `Semana del ${shortDate(start)} al ${shortDate(end)}${i === 0 ? " (en curso)" : ""}`,
      total: sumBetween(start, end),
    });
  }

  const month: RevenueBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = addMonths(today, -i);
    const end = addDays(addMonths(start, 1), -1);
    const [y, m] = start.split("-").map(Number);
    const name = MONTHS_ES[m - 1];
    month.push({
      label: MONTHS_SHORT[m - 1],
      detail: `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}${i === 0 ? " (en curso)" : ""}`,
      total: sumBetween(start, end),
    });
  }

  return { day, week, month };
}

type DashboardRow = {
  today_appointments: number;
  pending_orders: number;
  low_stock: ProductRow[];
  order_revenue: { date: string; total: number }[];
  appointment_revenue: { date: string; total: number }[];
  recent_orders: OrderAggRow[];
  upcoming: AppointmentRow[];
};

export async function getDashboardStats(today: string) {
  await releaseExpiredOrders();
  // La serie mensual es la que más atrás llega: 12 meses contando el actual.
  const revenueFrom = addMonths(today, -11);

  // Una sola consulta con subconsultas en vez de 7 en paralelo: con una
  // conexión por instancia y el pooler de Supabase en medio, 7 consultas
  // encimadas eran 7 viajes y el punto donde el dashboard se caía.
  const [row] = await getSql()<DashboardRow[]>`
    SELECT
      (SELECT COUNT(*)::int FROM appointments WHERE date = ${today} AND status != 'cancelada') AS today_appointments,
      (SELECT COUNT(*)::int FROM orders WHERE status = 'pendiente') AS pending_orders,
      (SELECT COALESCE(json_agg(p ORDER BY p.name ASC), '[]') FROM products p WHERE p.stock <= p.low_stock_threshold) AS low_stock,
      (SELECT COALESCE(json_agg(t), '[]') FROM (
        SELECT o.date AS date, SUM(oi.price * oi.qty)::int AS total
        FROM orders o JOIN order_items oi ON oi.order_id = o.id
        -- Igual que el corte de caja: solo lo que de verdad se cobró. Un pedido
        -- "pendiente" (WhatsApp sin pagar, checkout de Mercado Pago abandonado)
        -- todavía no es dinero que haya entrado.
        WHERE o.date BETWEEN ${revenueFrom} AND ${today} AND o.status IN ('pagado', 'entregado')
        GROUP BY o.date
      ) t) AS order_revenue,
      -- Las citas completadas también son ingreso real del taller, no solo lo vendido en la tienda.
      (SELECT COALESCE(json_agg(t), '[]') FROM (
        SELECT COALESCE(completed_at, date) AS date, SUM(amount)::int AS total
        FROM appointments
        WHERE COALESCE(completed_at, date) BETWEEN ${revenueFrom} AND ${today} AND status = 'completada' AND amount IS NOT NULL
        GROUP BY COALESCE(completed_at, date)
      ) t) AS appointment_revenue,
      (SELECT COALESCE(json_agg(r ORDER BY r.created_at DESC), '[]') FROM (
        SELECT o.*, COALESCE(
          json_agg(json_build_object('name', oi.name, 'price', oi.price, 'qty', oi.qty) ORDER BY oi.id) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT 5
      ) r) AS recent_orders,
      (SELECT COALESCE(json_agg(a ORDER BY a.date ASC, a.hour ASC), '[]') FROM (
        SELECT * FROM appointments
        WHERE date >= ${today} AND status NOT IN ('cancelada', 'completada')
        ORDER BY date ASC, hour ASC
        LIMIT 5
      ) a) AS upcoming
  `;

  const lowStock = row.low_stock.map(rowToProduct);
  const recentOrders = row.recent_orders.map((r) => rowsToOrder(r, r.items ?? []));
  const upcoming = row.upcoming.map(rowToAppointment);

  const revenueByDate = new Map<string, number>();
  for (const r of row.order_revenue) revenueByDate.set(r.date, (revenueByDate.get(r.date) ?? 0) + r.total);
  for (const r of row.appointment_revenue) revenueByDate.set(r.date, (revenueByDate.get(r.date) ?? 0) + r.total);
  const revenue = buildRevenueSeries(today, revenueByDate);
  const last14DaysRevenue = revenue.day.reduce((sum, b) => sum + b.total, 0);

  return {
    todayAppointments: row.today_appointments,
    pendingOrders: row.pending_orders,
    lowStock,
    last14DaysRevenue,
    revenue,
    recentOrders,
    upcoming,
  };
}
