-- Completes the store: file delivery, real stock availability, verified-buyer reviews, storage policies, editable site content.

alter table product_variants add column file_path text, add column download_limit int check (download_limit is null or download_limit > 0),
  add column download_expiry_days int check (download_expiry_days is null or download_expiry_days > 0);
alter table deliveries add column download_count int not null default 0;
alter table products add column sort_order int not null default 0;

-- Public, count-free stock signal. Runs as owner so customers never touch inventory_items.
create view variant_availability as
  select v.id as variant_id,
         (v.is_active and v.is_available and p.is_active and p.archived_at is null and
          (p.delivery_method <> 'license_key' or exists (select 1 from inventory_items i where i.variant_id = v.id and i.status = 'available'))) as in_stock
  from product_variants v join products p on p.id = v.product_id;
grant select on variant_availability to anon, authenticated;

create view product_rating_summary as
  select product_id, round(avg(rating)::numeric, 1) as average, count(*)::int as review_count from product_reviews where status = 'approved' group by product_id;
grant select on product_rating_summary to anon, authenticated;

-- Reviews: only customers whose order for that product was delivered may review
drop policy rev_write on product_reviews;
create policy rev_write on product_reviews for insert with check (
  user_id = auth.uid() and status = 'pending' and exists (
    select 1 from order_items oi join orders o on o.id = oi.order_id
    where oi.product_id = product_reviews.product_id and o.user_id = auth.uid() and o.status in ('delivered','completed')));

-- Automatic file delivery: one delivery row per purchased file, with download limit and expiry
create or replace function fulfil_file_items(p_order uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from orders where id = p_order and status in ('paid','processing','delivered','completed')) then raise exception 'order_not_paid'; end if;
  insert into deliveries (order_id, order_item_id, user_id, kind, file_path, download_limit, expires_at, status, delivered_at)
  select oi.order_id, oi.id, o.user_id, 'file', v.file_path, coalesce(v.download_limit, 5), now() + make_interval(days => coalesce(v.download_expiry_days, 30)), 'delivered', now()
  from order_items oi join orders o on o.id = oi.order_id join products p on p.id = oi.product_id join product_variants v on v.id = oi.variant_id
  where oi.order_id = p_order and p.delivery_method = 'file' and v.file_path is not null
    and not exists (select 1 from deliveries d where d.order_item_id = oi.id);
  get diagnostics n = row_count; return n;
end $$;
revoke all on function fulfil_file_items from public, anon, authenticated;

-- Tell the customer when support replies
create or replace function notify_ticket_reply() returns trigger language plpgsql security definer set search_path = public as $$
declare t record;
begin
  if new.is_staff then
    select user_id, subject into t from support_tickets where id = new.ticket_id;
    insert into notifications (user_id, title, body) values (t.user_id, 'Support replied', 'New reply on your ticket: ' || t.subject);
  end if; return new;
end $$;
create trigger support_reply_notify after insert on support_messages for each row execute function notify_ticket_reply();

-- Storage: public product images are admin-written; private files are admin-written and only ever served via signed URLs
create policy img_admin_write on storage.objects for insert with check (bucket_id in ('product-images','product-files') and is_admin());
create policy img_admin_update on storage.objects for update using (bucket_id in ('product-images','product-files') and is_admin());
create policy img_admin_delete on storage.objects for delete using (bucket_id in ('product-images','product-files') and is_admin());
create policy files_admin_read on storage.objects for select using (bucket_id = 'product-files' and is_admin());

-- Editable site content (public keys are readable by everyone). Policy texts are starting points: have them reviewed before launch.
insert into website_settings (key, value, is_public) values
 ('store_name', '"BuyDigital"', true), ('support_email', '""', true), ('support_phone', '""', true), ('whatsapp', '""', true),
 ('facebook', '""', true), ('instagram', '""', true), ('tiktok', '""', true), ('youtube', '""', true), ('announcement', '""', true),
 ('page_about', to_jsonb('BuyDigital is an independent online store for digital products in Malaysia. We list subscriptions, software, AI tools, gift cards and gaming top-ups, priced in Malaysian Ringgit (RM). We are not affiliated with, or endorsed by, the brands whose products we sell.'::text), true),
 ('page_faq', to_jsonb('How does it work? Choose a product and option, pay at checkout, and receive delivery after your payment is verified.

How fast is delivery? Codes and files are delivered automatically after payment is verified. Subscriptions and other items are fulfilled by our team and show their estimated time on the product page.

Where do I find my purchase? Log in and open My Orders. Your order page shows status, timeline and delivery details.

What if something goes wrong? Open a support ticket from your account and quote your order number.'::text), true),
 ('page_privacy', to_jsonb('We collect only what we need to run your account and orders: your name, email, optional phone number, and order history. Payments are processed by our payment provider; we never see or store your card number. We do not sell your personal data. You may request access to or deletion of your data by contacting support.'::text), true),
 ('page_terms', to_jsonb('By ordering from BuyDigital you agree to these terms. Products are digital and are delivered to your account after payment is verified. Prices are in Malaysian Ringgit (RM) and are confirmed at checkout. We sell only products we are authorised to supply. Codes and subscriptions are subject to the rules of the brand that issues them. We may cancel and refund an order we cannot fulfil.'::text), true),
 ('page_refund', to_jsonb('Digital codes that have been revealed or delivered cannot be returned, so they are generally not refundable unless they are invalid or not as described. If a product cannot be delivered, we refund you in full. To request a refund, open a support ticket with your order number. Approved refunds are returned to the original payment method; timing depends on your bank or e-wallet.'::text), true),
 ('page_delivery', to_jsonb('Delivery is digital. License codes and downloadable files are made available in your account as soon as payment is verified. Items fulfilled by our team show an estimated time on the product page. You can follow progress in My Orders. We will notify you by email and in your account when your order is delivered.'::text), true)
on conflict (key) do nothing;

-- Welcome notification on registration
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, phone)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  insert into notifications (user_id, title, body) values (new.id, 'Welcome to BuyDigital', 'Your account is ready. Verify your email to place orders.');
  return new;
end $$;
