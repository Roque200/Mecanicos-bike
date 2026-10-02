# Mecánicos Bike — Next.js

Rebuild of the Mecánicos Bike site (see `../mecanicos-biker/` for the original static version) using Next.js, React and Framer Motion, with an Apple-inspired visual style and scroll animations. Includes a Postgres-backed admin panel (Supabase), QR-code appointment check-in, and optional Mercado Pago online checkout. Built to deploy on Vercel.

## Stack

- Next.js 16 (App Router, Turbopack, Server Actions)
- Tailwind CSS v4
- Framer Motion (`motion`)
- Postgres via [Supabase](https://supabase.com) — see `supabase/schema.sql` for the schema and `.env.example` for how to point the app at it (`DATABASE_URL`).
- `qrcode` to generate the appointment QR codes, `html5-qrcode` for the admin's camera scanner.
- `mercadopago` (Checkout Pro) for optional online payments in the store.

## How data works

Everything that used to be mock arrays (`admin-data.ts`) now lives in Postgres (`src/lib/db.ts`): products, appointments, orders and customers. All reads/writes on the public site and the admin panel go through this same database, so:

- Booking an appointment on the public calendar creates a real row and blocks that exact slot for everyone else.
- Buying a product decrements its stock; cancelling an order restores it.
- Editing a product in the admin panel changes what shoppers see immediately.

The app never creates or seeds the database on its own — run `supabase/schema.sql` once in Supabase's SQL Editor to create the tables. For local development or tests, `node scripts/reset-test-db.mjs` (with `DATABASE_URL` pointed at a disposable Postgres) wipes and re-seeds sample data; never run it against production.

**Pendiente conocido:** las fotos de segunda mano (`src/lib/uploads.ts`) todavía se guardan en disco local (`data/uploads/`), lo cual **no funciona en Vercel** (sin disco persistente). Hay que moverlo a Supabase Storage (u otro almacenamiento de objetos) antes de publicar esa función en producción.

## QR check-in

Booking an appointment generates a QR code (and a shareable `/cita/<token>` link) shown to the customer right away and included in their WhatsApp confirmation message. At `/admin/escanear`, staff can scan that code with the device camera (or type/paste the code manually) to see the appointment and mark the customer as arrived.

## Online payments (Mercado Pago)

The store's "Pagar en línea" button only appears once `MERCADOPAGO_ACCESS_TOKEN` is set — see `.env.example`. Without it, checkout falls back to the WhatsApp flow only, and nothing breaks. To enable it:

1. Create a Mercado Pago developer account and grab an Access Token (start with the **test** one) at https://www.mercadopago.com.mx/developers/panel.
2. Put it in `.env.local` as `MERCADOPAGO_ACCESS_TOKEN=...`.
3. Mercado Pago redirects back to `/pedido/<id>` after payment and calls `/api/mercadopago/webhook` to confirm it — both are already wired up.

## Development

```bash
npm install
npm run dev
```

## Validate

```bash
npm run build   # production build + typecheck
npx eslint .
npx playwright test   # resets and reseeds DATABASE_URL before every run — point it at a disposable test database
```
