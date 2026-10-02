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
