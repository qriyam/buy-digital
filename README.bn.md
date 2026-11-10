# BuyDigital (বাংলা সেটআপ গাইড)

মালয়েশিয়ার জন্য ডিজিটাল পণ্যের দোকান (মুদ্রা: MYR)। React + TypeScript + Vite + Tailwind, ব্যাকএন্ড Supabase, পেমেন্ট ToyyibPay। কাস্টমারের সাইট ইংরেজি ও Bahasa Malaysia দুই ভাষায়।

ইংরেজি গাইড: [README.md](README.md)

## কী কী বানানো আছে
- **কাস্টমারের সাইট:** হোম, প্রোডাক্ট লিস্ট (সার্চ, ক্যাটাগরি/দাম/স্টক ফিল্টার, সর্ট, "আরও দেখুন"), ক্যাটাগরি, প্রোডাক্ট পেজ (ছবি, অপশন, রিভিউ), কার্ট ও কুপন, চেকআউট। লগইন করা কাস্টমারের কার্ট সেভ থাকে, আর লগইনের পর গেস্ট কার্ট মার্জ হয়।
- **কাস্টমার অ্যাকাউন্ট:** লগইন (ইমেইল/পাসওয়ার্ড ও Google), পাসওয়ার্ড রিসেট, অর্ডার লিস্ট ও টাইমলাইন, কেনা কোড দেখা, ফাইল ডাউনলোড, প্রোফাইল, নোটিফিকেশন, সাপোর্ট টিকেট।
- **অ্যাডমিন (`/admin`):** চার্টসহ ড্যাশবোর্ড ও লো-স্টক অ্যালার্ট, প্রোডাক্ট ও ক্যাটাগরি ম্যানেজমেন্ট, অর্ডার (সার্চ, ডিটেইল, ম্যানুয়াল ডেলিভারি, ক্যানসেল, রিফান্ড রেকর্ড), কাস্টমার (সাসপেন্ড/চালু), এনক্রিপ্টেড কোড ইনভেন্টরি, পেমেন্ট, কুপন, সাপোর্ট, রিভিউ মডারেশন, নোটিফিকেশন, ওয়েবসাইট সেটিংস, অ্যাডমিন ইউজার, অডিট লগ।
- **ডেটাবেস:** `supabase/migrations/`-এ দুটো ফাইল। প্রতিটি টেবিলে RLS আছে।
- **Edge Functions:** সব নামের শুরুতে `buydigital-`।

## একই Supabase প্রজেক্টে একাধিক ওয়েবসাইট
BuyDigital-এর সবকিছু আলাদা নামে রাখা হয়েছে, যাতে অন্য সাইটের সাথে মিশে না যায়।

| কী | কীভাবে আলাদা |
|---|---|
| টেবিল, ভিউ, ফাংশন | নিজস্ব স্কিমা `buydigital` (`public`-এ কিছু নেই, `auth.users`-এও ট্রিগার নেই) |
| মাইগ্রেশন ফাইল | টাইমস্ট্যাম্পসহ `…_buydigital_*.sql` |
| Edge Functions | `buydigital-<নাম>` |
| সিক্রেট (পুরো প্রজেক্টে শেয়ার্ড) | `BUYDIGITAL_<নাম>` |
| স্টোরেজ বাকেট ও পলিসি | `buydigital-product-images`, `buydigital-product-files`, পলিসি `buydigital_*` |
| প্রোফাইল | প্রথম লগইনে `buydigital.ensure_profile()` বানায়। অন্য সাইটের ইউজারের BuyDigital প্রোফাইল হয় না। অ্যাডমিন রোলও প্রতি সাইটের আলাদা। |

মনে রাখবি, Supabase Auth-এর ইউজার, ইমেইল টেমপ্লেট আর Site URL পুরো প্রজেক্টে শেয়ার্ড। তাই Auth সেটিংসে প্রতিটা সাইটের URL আলাদা করে যোগ করতে হবে।

## প্রথমবার সেটআপ
1. Supabase প্রজেক্ট খোল (বা আগেরটা ব্যবহার কর)। `supabase/migrations/`-এর চারটা ফাইল পরপর SQL এডিটরে চালা।
2. **Exposed schemas** লিস্টে `buydigital` যোগ কর। আগের স্কিমাগুলো রেখে দিবি। এটা না করলে সাইট টেবিল পড়তে পারবে না। ড্যাশবোর্ডের ভার্সন অনুযায়ী জায়গাটা হলো Project Settings > Data API, অথবা Integrations > Data API > Settings, অথবা (পুরোনো) Settings > API। মাইগ্রেশন চালানোর পরেই লিস্টে স্কিমাটা দেখা যাবে।
3. `cp .env.example .env` করে `VITE_SUPABASE_URL` আর `VITE_SUPABASE_ANON_KEY` বসা।
4. `supabase/secrets.example` কপি করে `supabase/secrets.env` নাম দে এবং সব মান ভর। এই ফাইল কখনো গিটে তুলবি না। তারপর চালা:
   `supabase secrets set --env-file supabase/secrets.env`
   `supabase/config.fragment.toml`-এর লেখা তোর `supabase/config.toml`-এ মিলিয়ে নে, তারপর শুধু এই সাইটের ফাংশনগুলো deploy কর:
   `supabase functions deploy buydigital-create-checkout buydigital-quote-cart buydigital-toyyibpay-webhook buydigital-reveal-delivery buydigital-get-download buydigital-admin-add-inventory buydigital-admin-fulfil buydigital-admin-order-action buydigital-admin-users buydigital-admin-notify`
5. সাইটে রেজিস্টার করে একবার লগইন কর। তারপর SQL এডিটরে নিজেকে অ্যাডমিন বানা:
   `insert into buydigital.user_roles (user_id, role) values ('<তোর auth.users id>', 'admin');`
6. `/admin`-এ গিয়ে Website Settings-এ যোগাযোগের তথ্য ও পলিসির লেখা বসা, আসল দামসহ প্রোডাক্ট যোগ কর, কোড আপলোড কর, তারপর প্রোডাক্টে "Visible in store" টিক দে।
7. Supabase Auth সেটিংসে Site URL ও redirect URL (`https://buydigital.my/**`) দে। Google লগইন চাইলে Google প্রোভাইডার চালু কর।

## পেমেন্ট (ToyyibPay)
ToyyibPay-এর জন্য Edge Function secrets-এ `BUYDIGITAL_TOYYIBPAY_SECRET_KEY` আর `BUYDIGITAL_TOYYIBPAY_CATEGORY_CODE` লাগবে। এগুলো চ্যাটে বা গিটে দিবি না।
- আগে `BUYDIGITAL_TOYYIBPAY_SANDBOX=true` রেখে স্যান্ডবক্সে টেস্ট কর।
- লাইভ করার আগে `supabase/functions/_shared/toyyibpay.ts`-এর ফিল্ডের নামগুলো ToyyibPay স্যান্ডবক্সের রেসপন্সের সাথে মিলিয়ে নে।
- ToyyibPay-তে রিফান্ড তাদের ড্যাশবোর্ড বা ব্যাংক ট্রান্সফারে করতে হয়। অ্যাডমিনের "Record refund" শুধু রেকর্ড রাখে, কাস্টমারের কোড বা ফাইলের অ্যাক্সেস বন্ধ করে আর তাকে জানায়।

## মনে রাখার কথা
- কোনো ডেমো ডেটা নেই। সাইটের সবকিছু তোর ডেটাবেস থেকে আসে।
- পলিসির পেজগুলোতে ছোট সাধারণ লেখা দেওয়া আছে। চালুর আগে কাউকে দিয়ে দেখিয়ে নিস।
- এটা সিঙ্গেল-পেজ অ্যাপ। সার্চ ইঞ্জিন JavaScript চালিয়ে পড়ে। `npm run build` চালালে `public/sitemap.xml`-এ তোর আসল প্রোডাক্টগুলো যোগ হয়।
- সেটআপের পর প্রথম অর্ডার স্যান্ডবক্সে টেস্ট করবি।
