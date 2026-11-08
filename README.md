# BuyDigital

Digital products store for Malaysia (MYR). React + TypeScript + Vite + Tailwind, Supabase backend, ToyyibPay payments.

## Run the storefront
    npm install
    npm run dev          # runs in demo mode until the Supabase keys below are set

## What exists
- Storefront: home, products (search/filter/sort), categories, product detail, cart.
- Accounts: Supabase Auth (email/password, Google, reset), customer dashboard (orders, order detail with timeline and code reveal, profile, notifications, support tickets).
- Admin (`/admin`, role checked in the database): dashboard stats, product price/availability, orders and manual fulfilment, encrypted code inventory upload, coupons, support replies, customers, payments, audit log.
- Database: `supabase/migrations/0001_schema.sql` (22 tables, RLS, atomic stock reservation, idempotent fulfilment). `supabase/seed.sql` adds inactive starter products.
- Edge Functions: `create-checkout`, `toyyibpay-webhook`, `reveal-delivery`, `admin-add-inventory`, `admin-fulfil`.

## Not built yet
Product/category create forms, admin charts, reviews UI, admin users page, refunds, file (download) delivery, website settings page, Bahasa Malaysia, per-page SEO tags.

## Setup (once)
1. Create a Supabase project; run `supabase/migrations/0001_schema.sql`, then optionally `supabase/seed.sql`.
2. `cp .env.example .env` and fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Merge `supabase/config.fragment.toml` into `supabase/config.toml`; set secrets from `supabase/secrets.example` (`supabase secrets set --env-file supabase/secrets.env`); `supabase functions deploy`.
4. Make yourself admin: `insert into user_roles (user_id, role) values ('<your auth user id>', 'admin');`
5. Set real prices, then activate products. Seed prices are placeholders.

Payments are only live once ToyyibPay credentials are set and tested in sandbox. Field names in `_shared/toyyibpay.ts` must be confirmed against the sandbox.
