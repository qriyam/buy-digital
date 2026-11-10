# BuyDigital

বাংলা গাইড: [README.bn.md](README.bn.md)

Digital products store for Malaysia (MYR). React + TypeScript + Vite + Tailwind, Supabase backend, ToyyibPay payments. English and Bahasa Malaysia storefront.

## What is built
- **Storefront:** home, products (search, category/price/stock filters, sorting, load more), categories, product pages (images, options, reviews, structured data), cart with server-priced coupons, checkout. Cart is saved for signed-in users and the guest cart merges on login.
- **Accounts:** Supabase Auth (email/password, Google, reset), dashboard with orders, order timeline, code reveal, file downloads, profile, notifications, support tickets.
- **Admin (`/admin`):** dashboard with charts and low-stock alerts; products (create/edit/archive, options, images, download files); categories; orders (search, detail, manual fulfilment, cancel, record refund); customers (suspend/reactivate); encrypted code inventory; payments; coupons; support; reviews moderation; notifications; website settings (contact details, social links, policy text); admin users; audit log.
- **Database:** `supabase/migrations/20261109000001_buydigital_schema.sql` and `…000002_buydigital_complete.sql` (RLS on every table, atomic stock reservation, idempotent fulfilment).
- **Edge Functions** (all prefixed `buydigital-`): `create-checkout`, `quote-cart`, `toyyibpay-webhook`, `reveal-delivery`, `get-download`, `admin-add-inventory`, `admin-fulfil`, `admin-order-action`, `admin-users`, `admin-notify`.

## Sharing one Supabase project with other websites
Everything BuyDigital creates is namespaced so several sites can live in one project without clashing:

| What | Convention |
|---|---|
| Tables, views, functions, sequence | Own Postgres schema `buydigital` (nothing in `public`, nothing on `auth.users`) |
| Migration files | Timestamped, named `…_buydigital_*.sql` so migration history never collides |
| Edge Functions | `buydigital-<name>` |
| Edge Function secrets (shared project-wide) | `BUYDIGITAL_<NAME>` |
| Storage buckets and policies | `buydigital-product-images`, `buydigital-product-files`, policies `buydigital_*` |
| Profiles | Created on first sign-in by `buydigital.ensure_profile()`, so people who only use another site get no BuyDigital profile. Admin roles are per site (`buydigital.user_roles`). |

Auth users are shared across the project (that is how Supabase Auth works). Email templates and the Site URL / redirect URLs in Auth settings are also shared, so list every site's URL there.

## First-time setup
1. Create (or open) your Supabase project. Run all four files in `supabase/migrations/` in order (SQL editor).
2. Add `buydigital` to the **Exposed schemas** list (keep the existing ones). Without this the site cannot read its tables. Where it lives depends on your dashboard version: Project Settings > Data API, or Integrations > Data API > Settings, or (older) Settings > API. The schema only appears in the list after the migrations have run.
3. `cp .env.example .env`; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Copy `supabase/secrets.example` to `supabase/secrets.env`, fill it in (never commit it), then:
   `supabase secrets set --env-file supabase/secrets.env`
   Merge `supabase/config.fragment.toml` into `supabase/config.toml`, then deploy only this site's functions:
   `supabase functions deploy buydigital-create-checkout buydigital-quote-cart buydigital-toyyibpay-webhook buydigital-reveal-delivery buydigital-get-download buydigital-admin-add-inventory buydigital-admin-fulfil buydigital-admin-order-action buydigital-admin-users buydigital-admin-notify`
5. Register on the site and sign in once, then in the SQL editor:
   `insert into buydigital.user_roles (user_id, role) values ('<your auth.users id>', 'admin');`
6. In `/admin`: set contact details and policy text (Website Settings), add products with real prices, upload codes, and switch products to "Visible in store".
7. In Supabase Auth settings, set the Site URL / redirect URLs (`https://buydigital.my/**`) and enable the Google provider if you want Google login.

## Payments
ToyyibPay needs `BUYDIGITAL_TOYYIBPAY_SECRET_KEY` and `BUYDIGITAL_TOYYIBPAY_CATEGORY_CODE` as Edge Function secrets. Test in sandbox first (`BUYDIGITAL_TOYYIBPAY_SANDBOX=true`), then confirm field names in `supabase/functions/_shared/toyyibpay.ts` against their sandbox responses before going live. ToyyibPay refunds are made in their dashboard or by bank transfer; "Record refund" in the admin cuts off access and notifies the customer.

## Notes
- No sample data ships with the app. Everything on the site comes from your database.
- The policy pages start with short generic text. Have them reviewed for your business before launch.
- This is a single-page app; search engines render it with JavaScript. `npm run build` regenerates `public/sitemap.xml` with your live products.
