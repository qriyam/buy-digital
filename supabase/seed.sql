-- Optional starter catalogue. Products are INACTIVE and prices are placeholders:
-- set real prices in /admin/products, then activate each product. Do not sell at these demo prices.
with c as (select id, slug from categories)
insert into products (slug, name, description, category_id, delivery_method, is_active, is_featured)
select v.slug, v.name, v.descr, c.id, v.dm, false, true from (values
 ('netflix','Netflix','Streaming subscription fulfilled through authorised channels.','streaming','manual'),
 ('youtube-premium','YouTube Premium','Ad-free viewing subscription.','streaming','manual'),
 ('duolingo-plus','Duolingo Plus','Language learning subscription.','education','manual'),
 ('chatgpt-plus','ChatGPT Plus','AI assistant subscription.','ai-tools','manual'),
 ('microsoft-365','Microsoft 365','Office suite subscription.','software','manual'),
 ('google-play-gift-card','Google Play Gift Card','Redeemable code delivered after verified payment.','gift-cards','license_key'),
 ('adobe-creative-cloud','Adobe Creative Cloud','Creative software subscription.','software','manual'),
 ('free-fire-diamonds','Free Fire Diamonds','In-game currency top-up.','gaming','license_key')
) as v(slug,name,descr,cat,dm) join c on c.slug = v.cat on conflict (slug) do nothing;

insert into product_variants (product_id, label, price, sort_order)
select p.id, v.label, v.price, v.ord from (values
 ('netflix','1 Month',26.90,1),('netflix','3 Months',80.70,2),('youtube-premium','1 Month',18.90,1),('duolingo-plus','1 Month',49.90,1),
 ('chatgpt-plus','1 Month',79.00,1),('microsoft-365','1 Year',59.00,1),('adobe-creative-cloud','1 Month',89.00,1),('free-fire-diamonds','Starter pack',10.00,1),
 ('google-play-gift-card','RM 10',10.00,1),('google-play-gift-card','RM 20',20.00,2),('google-play-gift-card','RM 50',50.00,3),('google-play-gift-card','RM 100',100.00,4)
) as v(slug,label,price,ord) join products p on p.slug = v.slug
where not exists (select 1 from product_variants x where x.product_id = p.id and x.label = v.label);
