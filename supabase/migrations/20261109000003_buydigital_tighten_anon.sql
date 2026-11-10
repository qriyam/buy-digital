-- Logged-out visitors only need the public catalogue. Everything else is for signed-in users (and RLS still applies).
do $$
declare t text;
begin
  foreach t in array array['admin_audit_logs','cart_items','carts','coupon_redemptions','coupons','deliveries','notifications','order_events','order_items','orders','payments','profiles','support_messages','support_tickets','user_roles']
  loop
    execute format('revoke all on buydigital.%I from anon', t);
  end loop;
end $$;
-- anon keeps SELECT on: categories, products, product_images, product_variants, product_reviews, website_settings, variant_availability, product_rating_summary
