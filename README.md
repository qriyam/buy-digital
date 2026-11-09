# BuyDigital

Digital products store for Malaysia (MYR). React + TypeScript + Vite + Tailwind, Supabase backend, ToyyibPay payments. English and Bahasa Malaysia storefront.

## What is built
- **Storefront:** home, products (search, category/price/stock filters, sorting, load more), categories, product pages (images, options, reviews, structured data), cart with server-priced coupons, checkout. Cart is saved for signed-in users and the guest cart merges on login.
- **Accounts:** Supabase Auth (email/password, Google, reset), dashboard with orders, order timeline, code reveal, file downloads, profile, notifications, support tickets.
- **Admin (`/admin`):** dashboard with charts and low-stock alerts; products (create/edit/archive, options, images, download files); categories; orders (search, detail, manual fulfilment, cancel, record refund); customers (suspend/reactivate); encrypted code inventory; payments; coupons; support; reviews moderation; notifications; website settings (contact details, social links, policy text); admin users; audit log.
- **Database:** `supabase/migrations/0001_schema.sql` and `0002_complete.sql` (RLS on every table, atomic stock reservation, idempotent fulfilment).
- **Edge Functions:** `create-checkout`, `quote-cart`, `toyyibpay-webhook`, `reveal-delivery`, `get-download`, `admin-add-inventory`, `admin-fulfil`, `admin-order-action`, `admin-users`, `admin-notify`.

## First-time setup
1. Create a Supabase project. Run both migrations in `supabase/migrations/` in order (SQL editor).
2. `cp .env.example .env`; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Copy `supabase/secrets.example` to `supabase/secrets.env` and fill it in (never commit it). Then:
   `supabase secrets set --env-file supabase/secrets.env` and `supabase functions deploy`.
   Merge `supabase/config.fragment.toml` into `supabase/config.toml` first.
4. Register on the site, then in the SQL editor: `insert into user_roles (user_id, role) values ('<your auth.users id>', 'admin');`
5. In `/admin`: set contact details and policy text (Website Settings), add products with real prices, upload codes, and switch products to "Visible in store".
6. In Supabase Auth settings, set the Site URL to your domain and add `https://buydigital.my/**` to redirect URLs; enable the Google provider if you want Google login.

## Payments
ToyyibPay needs `TOYYIBPAY_SECRET_KEY` and `TOYYIBPAY_CATEGORY_CODE` as Edge Function secrets. Test in sandbox first (`TOYYIBPAY_SANDBOX=true`), then confirm field names in `supabase/functions/_shared/toyyibpay.ts` against their sandbox responses before going live. ToyyibPay refunds are made in their dashboard or by bank transfer; "Record refund" in the admin cuts off access and notifies the customer.

## Notes
- No sample data ships with the app. Everything on the site comes from your database.
- The policy pages start with short generic text. Have them reviewed for your business before launch.
- This is a single-page app; search engines render it with JavaScript. `npm run build` regenerates `public/sitemap.xml` with your live products.
