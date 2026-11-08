# BuyDigital

Digital products store for Malaysia (MYR). React + TypeScript + Vite + Tailwind.

## Run
    npm install
    npm run dev

## Status
- Done: storefront (home, products, categories, product detail, cart), brand design system.
- Demo data in `src/data/catalog.ts` is placeholder only; prices are not real offers.
- Backend pieces in `supabase/functions`: ToyyibPay adapter, webhook, create-checkout.
  They import `_shared/http.ts`, `_shared/db.ts`, `_shared/fulfil.ts`, which are not in this repo yet.
- Not built yet: database migrations and RLS, authentication, real checkout, customer dashboard, admin panel.
- Checkout shows an honest "payments not connected" notice until the backend is deployed.

Secrets: copy `supabase/secrets.example` to `supabase/secrets.env` (git-ignored) and fill in values.
