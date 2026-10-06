-- Esquema de Mecánicos Bike para Supabase (Postgres).
-- Traducido 1:1 desde el esquema de SQLite en src/lib/db.ts.
--
-- Cómo usarlo: entra a tu proyecto de Supabase → "SQL Editor" → "New query",
-- pega todo este archivo y dale "Run". Se puede correr más de una vez sin
-- problema (todo usa "IF NOT EXISTS").

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
  last_visit TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 0,
  reward_lifetime INTEGER NOT NULL DEFAULT 0,
  rewards_redeemed INTEGER NOT NULL DEFAULT 0,
  last_reward TEXT
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
  amount INTEGER,
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot
  ON appointments(date, hour)
  WHERE status <> 'cancelada';

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  payment_method TEXT NOT NULL DEFAULT 'whatsapp',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  date TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD'),
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
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
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

CREATE TABLE IF NOT EXISTS secondhand_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  condition TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'disponible',
  created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')
);

-- El horario semanal debe existir siempre — si está vacía, se llena con el
-- horario por defecto (Lun-Vie 9-18, Sáb 9-14, Dom cerrado), igual que hace
-- migrate() en SQLite la primera vez.
INSERT INTO weekly_schedule (day_of_week, is_open, open_hour, close_hour) VALUES
  (0, 0, 9, 14),
  (1, 1, 9, 18),
  (2, 1, 9, 18),
  (3, 1, 9, 18),
  (4, 1, 9, 18),
  (5, 1, 9, 18),
  (6, 1, 9, 14)
ON CONFLICT (day_of_week) DO NOTHING;

-- ============================================================
-- Índices (revisión de rendimiento, octubre 2026)
--
-- order_items.order_id no tenía índice: todo JOIN de pedidos con sus líneas
-- (listOrders, getOrder, el dashboard, el restock al cancelar) hacía un
-- recorrido completo de la tabla. Los demás apuntan a las columnas que más
-- se filtran (fechas y estados) en el calendario, el dashboard y el corte.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_secondhand_status ON secondhand_items(status);

-- ============================================================
-- Validaciones (CHECK), octubre 2026
--
-- Repiten en Postgres las mismas reglas que ya exige TypeScript, como
-- segunda capa de protección. Se agregan con NOT VALID: no exigen que las
-- filas que ya existan las cumplan (no hay que revisar datos viejos antes
-- de correr esto), pero sí aplican desde ya a cualquier INSERT/UPDATE
-- nuevo. Envueltas en DO/EXCEPTION para poder correr este archivo más de
-- una vez sin que truene por "la restricción ya existe".
-- ============================================================
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_price_check CHECK (price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_low_stock_threshold_check CHECK (low_stock_threshold >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_visits_check CHECK (visits >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_total_spent_check CHECK (total_spent >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_reward_points_check CHECK (reward_points >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_reward_lifetime_check CHECK (reward_lifetime >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT customers_rewards_redeemed_check CHECK (rewards_redeemed >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_amount_check CHECK (amount IS NULL OR amount >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_date_format_check CHECK (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_hour_format_check CHECK (hour ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pendiente', 'pagado', 'entregado', 'cancelado')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
    CHECK (payment_method IN ('whatsapp', 'mercadopago', 'mostrador')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT orders_date_format_check CHECK (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE order_items ADD CONSTRAINT order_items_price_check CHECK (price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE order_items ADD CONSTRAINT order_items_qty_check CHECK (qty > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reward_items ADD CONSTRAINT reward_items_points_cost_check CHECK (points_cost > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE reward_items ADD CONSTRAINT reward_items_active_check CHECK (active IN (0, 1)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE testimonials ADD CONSTRAINT testimonials_stars_check CHECK (stars BETWEEN 1 AND 5) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE testimonials ADD CONSTRAINT testimonials_status_check
    CHECK (status IN ('pendiente', 'aprobado', 'rechazado')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE secondhand_items ADD CONSTRAINT secondhand_items_price_check CHECK (price >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE secondhand_items ADD CONSTRAINT secondhand_items_status_check
    CHECK (status IN ('disponible', 'vendido')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE weekly_schedule ADD CONSTRAINT weekly_schedule_is_open_check CHECK (is_open IN (0, 1)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE schedule_overrides ADD CONSTRAINT schedule_overrides_closed_check CHECK (closed IN (0, 1)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Fecha de cobro de las citas (octubre 2026)
--
-- El dinero de una cita cuenta el día en que se marcó como completada, no
-- el día en que estaba agendada (un trabajo puede hacerse antes o después).
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at TEXT;

-- ============================================================
-- Fotos de segunda mano (Supabase Storage), octubre 2026
--
-- Bucket público: cualquiera puede ver las fotos en la tienda, pero solo el
-- servidor (con la llave secreta) puede subirlas o borrarlas. Límite de 5 MB
-- y solo JPG/PNG/WEBP, igual que valida src/lib/uploads.ts. Fuera de
-- Supabase (Postgres local de pruebas) no existe el esquema storage y esto
-- no hace nada.
-- ============================================================
DO $$ BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('segunda-mano', 'segunda-mano', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;

-- ============================================================
-- Seguridad: límite de intentos (octubre 2026)
--
-- Contador por acción e IP ("login:1.2.3.4") en ventanas fijas — ver
-- hitRateLimit en src/lib/db.ts. Si esta tabla no existe, la app sigue
-- funcionando pero sin límite de intentos.
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  hits INTEGER NOT NULL
);

-- Consultas por teléfono: citas próximas y pedidos pendientes por cliente.
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(phone);
CREATE INDEX IF NOT EXISTS idx_orders_phone_status ON orders(phone, status);
