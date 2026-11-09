-- Core schema. Money is numeric(12,2) in MYR. All writes to orders/payments/inventory
-- happen in Edge Functions with the service role; customers only ever SELECT their own rows.
-- BuyDigital lives in its own Postgres schema, "buydigital", so it can share one Supabase project with other
-- websites without table, function or view names colliding. Nothing here touches the public schema or auth.users.
-- After running, add "buydigital" to Settings > API > Exposed schemas in the Supabase dashboard.
create schema if not exists buydigital;
grant usage on schema buydigital to anon, authenticated, service_role;
alter default privileges in schema buydigital grant all on tables to service_role;
alter default privileges in schema buydigital grant all on sequences to service_role;
alter default privileges in schema buydigital grant execute on functions to service_role;
set search_path = buydigital, public;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────── identity ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null, full_name text, phone text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
-- Role check reads the table, never user-editable metadata.
create or replace function is_admin() returns boolean language sql stable security definer set search_path = buydigital, public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','staff'));
$$;

-- Profiles are created by the app after sign-in, not by a trigger on auth.users, so people who sign up on other
-- websites in this project never get a BuyDigital profile. Safe to call repeatedly.
create or replace function ensure_profile() returns void language plpgsql security definer set search_path = buydigital, public as $$
declare u record;
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then return; end if;
  select email, raw_user_meta_data from auth.users where id = auth.uid() into u;
  insert into profiles (id, email, full_name, phone)
  values (auth.uid(), coalesce(u.email, ''), nullif(u.raw_user_meta_data->>'full_name',''), nullif(u.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  insert into notifications (user_id, title, body) values (auth.uid(), 'Welcome to BuyDigital', 'Your account is ready. Verify your email to place orders.');
end $$;
revoke all on function ensure_profile from public, anon;
grant execute on function ensure_profile to authenticated;

-- ───────── catalogue ─────────
create table categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  description text, icon text, sort_order int not null default 0, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table products (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  description text, category_id uuid references categories(id) on delete set null,
  delivery_method text not null default 'manual' check (delivery_method in ('license_key','file','manual','subscription')),
  delivery_estimate text, validity text, instructions text, refund_note text,
  is_active boolean not null default true, is_featured boolean not null default false, is_popular boolean not null default false,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on products (category_id);
create table product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
  path text not null, alt text, sort_order int not null default 0
);
create table product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade,
  label text not null, price numeric(12,2) not null check (price >= 0), currency char(3) not null default 'MYR' check (currency = 'MYR'),
  is_active boolean not null default true, is_available boolean not null default true, sort_order int not null default 0,
  low_stock_threshold int not null default 5, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on product_variants (product_id);

-- Secret codes: AES-GCM ciphertext (base64) + HMAC hash for duplicate detection. Never selectable by clients.
create table inventory_items (
  id uuid primary key default gen_random_uuid(), variant_id uuid not null references product_variants(id) on delete cascade,
  code_encrypted text not null, code_hash text not null unique,
  status text not null default 'available' check (status in ('available','reserved','used','void')),
  reserved_order_item_id uuid, reserved_until timestamptz, delivered_order_item_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on inventory_items (variant_id, status);

-- ───────── carts ─────────
create table carts (id uuid primary key default gen_random_uuid(), user_id uuid not null unique references profiles(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table cart_items (
  id uuid primary key default gen_random_uuid(), cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity int not null check (quantity between 1 and 10), unique (cart_id, variant_id)
);

-- ───────── coupons ─────────
create table coupons (
  id uuid primary key default gen_random_uuid(), code text not null, discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0), min_order numeric(12,2) not null default 0, max_discount numeric(12,2),
  starts_at timestamptz, expires_at timestamptz, usage_limit int, per_user_limit int not null default 1,
  product_ids uuid[] not null default '{}', category_ids uuid[] not null default '{}', is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index coupons_code_ci on coupons (lower(code));

-- ───────── orders & payments ─────────
create sequence order_number_seq start 100001;
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('BD-' || nextval('order_number_seq')),
  user_id uuid not null references profiles(id), email text not null, currency char(3) not null default 'MYR',
  coupon_id uuid references coupons(id), subtotal numeric(12,2) not null, discount_total numeric(12,2) not null default 0, total numeric(12,2) not null,
  status text not null default 'pending_payment' check (status in ('pending_payment','payment_processing','paid','processing','delivered','completed','cancelled','refunded','failed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on orders (user_id, created_at desc); create index on orders (status);
create table order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id), variant_id uuid not null references product_variants(id),
  product_name text not null, variant_label text not null, unit_price numeric(12,2) not null, quantity int not null check (quantity > 0), line_total numeric(12,2) not null
);
create index on order_items (order_id);
create table order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  status text not null, message text, actor_id uuid, created_at timestamptz not null default now()
);
create index on order_events (order_id, created_at);
create table payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  provider text not null, provider_ref text, amount numeric(12,2) not null, currency char(3) not null default 'MYR',
  status text not null default 'pending' check (status in ('pending','succeeded','failed','cancelled','refunded')),
  verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index on payments (order_id);
create table payment_events (
  id uuid primary key default gen_random_uuid(), provider text not null, event_id text not null,
  payload jsonb, signature_valid boolean not null default false, received_at timestamptz not null default now(),
  unique (provider, event_id)
);
create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(), coupon_id uuid not null references coupons(id), order_id uuid not null unique references orders(id) on delete cascade,
  user_id uuid not null references profiles(id), amount numeric(12,2) not null, created_at timestamptz not null default now()
);
create table deliveries (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade,
  order_item_id uuid not null references order_items(id) on delete cascade, user_id uuid not null references profiles(id),
  kind text not null check (kind in ('license_key','file','manual','subscription')),
  inventory_item_id uuid unique references inventory_items(id), file_path text, download_limit int, expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending','delivered')), note text, delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index on deliveries (order_id);

-- ───────── engagement ─────────
create table notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade,
  title text not null, body text, read_at timestamptz, created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);
create table support_tickets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id) on delete cascade, order_id uuid references orders(id),
  category text not null, subject text not null,
  status text not null default 'open' check (status in ('open','in_progress','waiting_customer','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table support_messages (
  id uuid primary key default gen_random_uuid(), ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_id uuid not null references profiles(id), is_staff boolean not null default false, body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create table product_reviews (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade,
  order_item_id uuid references order_items(id), rating int not null check (rating between 1 and 5), body text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create table website_settings (key text primary key, value jsonb not null, is_public boolean not null default false, updated_at timestamptz not null default now());
create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity text, entity_id text, details jsonb,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['profiles','categories','products','product_variants','inventory_items','carts','coupons','orders','payments','support_tickets'] loop
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()', t || '_updated', t);
  end loop; end $$;

-- ───────── server-side logic ─────────
-- Atomically reserve p_qty codes for an order line; raises insufficient_stock if short.
create or replace function reserve_inventory(p_variant uuid, p_order_item uuid, p_qty int) returns void
language plpgsql security definer set search_path = buydigital, public as $$
declare got int;
begin
  with pick as (
    select id from inventory_items where variant_id = p_variant and status = 'available'
    order by created_at limit p_qty for update skip locked)
  update inventory_items i set status = 'reserved', reserved_order_item_id = p_order_item, reserved_until = now() + interval '30 minutes'
  from pick where i.id = pick.id;
  get diagnostics got = row_count;
  if got < p_qty then raise exception 'insufficient_stock'; end if;
end $$;

create or replace function release_expired_reservations() returns void language sql security definer set search_path = buydigital, public as $$
  update inventory_items set status = 'available', reserved_order_item_id = null, reserved_until = null
  where status = 'reserved' and reserved_until < now();
$$;

-- Returns true only the first time an event id is seen (webhook retries return false).
create or replace function claim_payment_event(p_provider text, p_event text, p_payload jsonb, p_sig_ok boolean) returns boolean
language plpgsql security definer set search_path = buydigital, public as $$
declare n int;
begin
  insert into payment_events (provider, event_id, payload, signature_valid) values (p_provider, p_event, p_payload, p_sig_ok) on conflict do nothing;
  get diagnostics n = row_count; return n = 1;
end $$;

-- Idempotent: turns reserved codes into delivered codes for a paid order. Returns number of codes newly delivered.
create or replace function fulfil_license_items(p_order uuid) returns int
language plpgsql security definer set search_path = buydigital, public as $$
declare r record; n int := 0; c int;
begin
  if not exists (select 1 from orders where id = p_order and status in ('paid','processing','delivered','completed')) then
    raise exception 'order_not_paid';
  end if;
  for r in select oi.id as item_id, o.user_id, oi.order_id from order_items oi join orders o on o.id = oi.order_id
           join products p on p.id = oi.product_id where oi.order_id = p_order and p.delivery_method = 'license_key' loop
    with moved as (
      update inventory_items set status = 'used', delivered_order_item_id = r.item_id, reserved_until = null
      where reserved_order_item_id = r.item_id and status = 'reserved' returning id)
    insert into deliveries (order_id, order_item_id, user_id, kind, inventory_item_id, status, delivered_at)
      select r.order_id, r.item_id, r.user_id, 'license_key', id, 'delivered', now() from moved on conflict (inventory_item_id) do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return n;
end $$;

revoke all on function reserve_inventory, release_expired_reservations, claim_payment_event, fulfil_license_items from public, anon, authenticated;

-- ───────── row level security ─────────
do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','categories','products','product_images','product_variants','inventory_items','carts','cart_items','coupons','coupon_redemptions',
    'orders','order_items','order_events','payments','payment_events','deliveries','notifications','support_tickets','support_messages','product_reviews','website_settings','admin_audit_logs'] loop
    execute format('alter table %I enable row level security', t);
  end loop; end $$;

-- public catalogue
create policy cat_read on categories for select using (is_active or is_admin());
create policy prod_read on products for select using ((is_active and archived_at is null) or is_admin());
create policy img_read on product_images for select using (exists (select 1 from products p where p.id = product_id and p.is_active and p.archived_at is null) or is_admin());
create policy var_read on product_variants for select using ((is_active and exists (select 1 from products p where p.id = product_id and p.is_active and p.archived_at is null)) or is_admin());
create policy rev_read on product_reviews for select using (status = 'approved' or user_id = auth.uid() or is_admin());
create policy rev_write on product_reviews for insert with check (user_id = auth.uid() and status = 'pending');
create policy set_read on website_settings for select using (is_public or is_admin());
-- catalogue writes: admins only
create policy cat_admin on categories for all using (is_admin()) with check (is_admin());
create policy prod_admin on products for all using (is_admin()) with check (is_admin());
create policy img_admin on product_images for all using (is_admin()) with check (is_admin());
create policy var_admin on product_variants for all using (is_admin()) with check (is_admin());
create policy rev_admin on product_reviews for update using (is_admin()) with check (is_admin());
create policy set_admin on website_settings for all using (is_admin()) with check (is_admin());
create policy coupon_admin on coupons for all using (is_admin()) with check (is_admin());

-- own data
create policy prof_read on profiles for select using (id = auth.uid() or is_admin());
create policy prof_upd on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy admin_status on profiles for update using (is_admin()) with check (is_admin());
create policy roles_read on user_roles for select using (user_id = auth.uid() or is_admin());
create policy cart_own on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_own on cart_items for all using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy ord_read on orders for select using (user_id = auth.uid() or is_admin());
create policy oi_read on order_items for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy oe_read on order_events for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy pay_read on payments for select using (is_admin() or exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
create policy red_read on coupon_redemptions for select using (user_id = auth.uid() or is_admin());
create policy del_read on deliveries for select using (user_id = auth.uid() or is_admin());
create policy note_read on notifications for select using (user_id = auth.uid());
create policy note_mark on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tk_read on support_tickets for select using (user_id = auth.uid() or is_admin());
create policy tk_new on support_tickets for insert with check (user_id = auth.uid() and status = 'open' and priority = 'normal');
create policy tk_admin on support_tickets for update using (is_admin()) with check (is_admin());
create policy msg_read on support_messages for select using (exists (select 1 from support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_admin())));
create policy msg_new on support_messages for insert with check (author_id = auth.uid() and is_staff = is_admin()
  and exists (select 1 from support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_admin())));
create policy audit_read on admin_audit_logs for select using (is_admin());
-- inventory_items and payment_events: RLS on, no policies => no client access at all.

-- column-level hardening
revoke insert, update, delete on all tables in schema buydigital from anon, authenticated;
revoke update on profiles from authenticated; grant update (full_name, phone) on profiles to authenticated;
grant select on all tables in schema buydigital to anon, authenticated;
revoke select on inventory_items, payment_events from anon, authenticated;
-- Re-grant the client writes that the policies above govern
grant insert, update, delete on carts, cart_items to authenticated;
grant insert on product_reviews, support_tickets, support_messages to authenticated;
grant update (read_at) on notifications to authenticated;
-- admin writes go through RLS is_admin() policies
grant insert, update, delete on categories, products, product_images, product_variants, coupons, website_settings to authenticated;
grant update (status) on product_reviews to authenticated;
grant update (status, priority) on support_tickets to authenticated;
-- Only admins may change an account's status (customers can update their own row, so guard the column)
create or replace function guard_profile_status() returns trigger language plpgsql security definer set search_path = buydigital, public as $$
begin
  if new.status is distinct from old.status and not is_admin() then raise exception 'forbidden_status_change'; end if;
  return new;
end $$;
create trigger profiles_guard_status before update on profiles for each row execute function guard_profile_status();
grant update (status) on profiles to authenticated;

-- Masked inventory view for the admin UI (no code columns). Runs as owner, so it filters on is_admin() itself.
create view inventory_overview as
  select id, variant_id, status, reserved_until, delivered_order_item_id, created_at from inventory_items where is_admin();
grant select on inventory_overview to authenticated;

-- Private bucket for downloadable files (served only through signed URLs from an Edge Function)
insert into storage.buckets (id, name, public) values ('buydigital-product-files', 'buydigital-product-files', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('buydigital-product-images', 'buydigital-product-images', true) on conflict do nothing;

insert into categories (slug, name, description, icon, sort_order) values
 ('streaming','Streaming','Video and music subscriptions','Tv',1),('education','Education','Learning apps and courses','GraduationCap',2),
 ('ai-tools','AI Tools','Assistants and AI subscriptions','Sparkles',3),('software','Software','Office and creative software','AppWindow',4),
 ('gift-cards','Gift Cards','Store and platform credit','Gift',5),('gaming','Gaming','In-game currency and top-ups','Gamepad2',6),
 ('productivity','Productivity','Tools for work and study','ListChecks',7),('other','Other Digital Products','Everything else digital','Package',8);
