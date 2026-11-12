import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const en = {
  home: "Home", products: "Products", categories: "Categories", about: "About", contact: "Contact", search: "Search products", login: "Login / Sign Up", account: "My Account", language: "Language",
  heroTitle: "Your Digital World, Simplified.", heroSub: "Get your favorite subscriptions, software, AI tools, gift cards and more — all in one place.",
  explore: "Explore Products", how: "How It Works", trust1: "Instant Digital Delivery", trust2: "Secure Payments", trust3: "24/7 Customer Support",
  shopByCategory: "Shop by category", productWord: "product", productsWord: "products", popular: "Popular products", viewAll: "View all",
  why: "Why choose BuyDigital?", w1: "Instant Delivery", w1d: "Receive eligible digital products quickly after successful payment.", w2: "Secure Payments", w2d: "Secure checkout with supported payment providers.",
  w3: "24/7 Support", w3d: "Get help whenever you need it.", w4: "Trusted Shopping", w4d: "Transparent pricing, clear product descriptions, and reliable order tracking.",
  ctaTitle: "Start Your Digital Journey Today", ctaDesc: "Discover digital products that make your everyday life easier.", ctaBtn: "Explore All Products",
  quickLinks: "Quick links", support: "Support", privacy: "Privacy Policy", terms: "Terms & Conditions", refund: "Refund Policy", delivery: "Shipping & Delivery", contactUs: "Contact us", faq: "FAQ",
  footerBlurb: "Digital products for Malaysia, priced in RM. BuyDigital is an independent reseller and is not affiliated with the brands it lists.", rights: "All rights reserved.",
  instant: "Instant delivery", available: "Available", out: "Out of stock", buyNow: "Buy now", from: "From", loading: "Loading…", loadMore: "Load more",
  allCategories: "All categories", sortPopular: "Popular", sortLow: "Price: Low to High", sortHigh: "Price: High to Low", sortNew: "Newest", inStockOnly: "In stock only", noMatch: "No products match your search.",
  option: "Option", quantity: "Quantity", addToCart: "Add to Cart", related: "Related products", category: "Category", deliveryMethod: "Delivery", availability: "Availability", validity: "Validity",
  estimate: "Delivery estimate", instructions: "Instructions", refundInfo: "Refund eligibility", autoDelivery: "Automatic after verified payment", teamDelivery: "Fulfilled by our team after verified payment",
  reviews: "Reviews", noReviews: "No reviews yet.", writeReview: "Write a review", rating: "Rating", submitReview: "Submit review", reviewThanks: "Thanks! Your review will appear after approval.", verifiedBuyer: "Verified buyer",
  cart: "Cart", cartEmpty: "Your cart is empty", continueShopping: "Continue Shopping", subtotal: "Subtotal", discount: "Discount", total: "Total", toCheckout: "Proceed to Checkout", coupon: "Coupon code", apply: "Apply",
  finalNote: "The final total is calculated on the server before you pay.", checkout: "Checkout", pay: "Pay securely", paying: "Starting payment…", loginToContinue: "Log in to continue", verifyEmail: "Please verify your email address before ordering.", backToCart: "Back to cart",
  login2: "Log in", register: "Create account", email: "Email", password: "Password", confirmPassword: "Confirm password", fullName: "Full name", forgot: "Forgot password?", signUp: "Sign up", google: "Continue with Google", sendReset: "Send reset link",
  payOk: "Payment successful", payVerified: "Payment verified", orderDelivered: "Order delivered", orderReady: "Your order is ready", emailBody: "Open your order to see your delivery details.", payMethods: "FPX · Cards · E-wallets",
  payMethod: "Payment method", fpx: "FPX Online Banking", fpxHint: "Pay straight from your bank account", cardsLbl: "Credit / Debit card", ewalletLbl: "E-wallet", noCard: "No card needed",
  chooseBank: "Select your bank", redirecting: "Redirecting to your bank…", approvePay: "Approve payment", approveBtn: "Approve", viaFpx: "Paid via FPX", outNote: "This option is out of stock right now. Please check back soon.",
  storeSetup: "The store is being set up. Please check back soon.", notFound: "not found", browse: "Browse products",
};
export type Key = keyof typeof en;
const ms: Record<Key, string> = {
  home: "Utama", products: "Produk", categories: "Kategori", about: "Tentang", contact: "Hubungi", search: "Cari produk", login: "Log Masuk / Daftar", account: "Akaun Saya", language: "Bahasa",
  heroTitle: "Dunia Digital Anda, Dipermudahkan.", heroSub: "Dapatkan langganan, perisian, alat AI, kad hadiah kegemaran anda dan banyak lagi — semuanya di satu tempat.",
  explore: "Terokai Produk", how: "Cara Ia Berfungsi", trust1: "Penghantaran Digital Segera", trust2: "Pembayaran Selamat", trust3: "Sokongan Pelanggan 24/7",
  shopByCategory: "Beli mengikut kategori", productWord: "produk", productsWord: "produk", popular: "Produk popular", viewAll: "Lihat semua",
  why: "Mengapa pilih BuyDigital?", w1: "Penghantaran Segera", w1d: "Terima produk digital yang layak dengan pantas selepas pembayaran berjaya.", w2: "Pembayaran Selamat", w2d: "Pembayaran selamat melalui penyedia pembayaran yang disokong.",
  w3: "Sokongan 24/7", w3d: "Dapatkan bantuan pada bila-bila masa anda perlukan.", w4: "Beli-belah Dipercayai", w4d: "Harga telus, penerangan produk yang jelas dan penjejakan pesanan yang boleh dipercayai.",
  ctaTitle: "Mulakan Perjalanan Digital Anda Hari Ini", ctaDesc: "Terokai produk digital yang memudahkan kehidupan seharian anda.", ctaBtn: "Terokai Semua Produk",
  quickLinks: "Pautan pantas", support: "Sokongan", privacy: "Dasar Privasi", terms: "Terma & Syarat", refund: "Dasar Bayaran Balik", delivery: "Penghantaran", contactUs: "Hubungi kami", faq: "Soalan Lazim",
  footerBlurb: "Produk digital untuk Malaysia, dalam RM. BuyDigital ialah penjual semula bebas dan tidak berkaitan dengan jenama yang disenaraikan.", rights: "Hak cipta terpelihara.",
  instant: "Penghantaran segera", available: "Ada stok", out: "Kehabisan stok", buyNow: "Beli sekarang", from: "Daripada", loading: "Memuatkan…", loadMore: "Muat lagi",
  allCategories: "Semua kategori", sortPopular: "Popular", sortLow: "Harga: Rendah ke Tinggi", sortHigh: "Harga: Tinggi ke Rendah", sortNew: "Terbaru", inStockOnly: "Hanya yang ada stok", noMatch: "Tiada produk sepadan dengan carian anda.",
  option: "Pilihan", quantity: "Kuantiti", addToCart: "Tambah ke Troli", related: "Produk berkaitan", category: "Kategori", deliveryMethod: "Penghantaran", availability: "Ketersediaan", validity: "Tempoh sah",
  estimate: "Anggaran penghantaran", instructions: "Arahan", refundInfo: "Kelayakan bayaran balik", autoDelivery: "Automatik selepas pembayaran disahkan", teamDelivery: "Dipenuhi oleh pasukan kami selepas pembayaran disahkan",
  reviews: "Ulasan", noReviews: "Belum ada ulasan.", writeReview: "Tulis ulasan", rating: "Penilaian", submitReview: "Hantar ulasan", reviewThanks: "Terima kasih! Ulasan anda akan dipaparkan selepas diluluskan.", verifiedBuyer: "Pembeli disahkan",
  cart: "Troli", cartEmpty: "Troli anda kosong", continueShopping: "Teruskan Membeli-belah", subtotal: "Jumlah kecil", discount: "Diskaun", total: "Jumlah", toCheckout: "Teruskan ke Pembayaran", coupon: "Kod kupon", apply: "Guna",
  finalNote: "Jumlah akhir dikira di pelayan sebelum anda membayar.", checkout: "Pembayaran", pay: "Bayar dengan selamat", paying: "Memulakan pembayaran…", loginToContinue: "Log masuk untuk teruskan", verifyEmail: "Sila sahkan alamat e-mel anda sebelum membuat pesanan.", backToCart: "Kembali ke troli",
  login2: "Log masuk", register: "Cipta akaun", email: "E-mel", password: "Kata laluan", confirmPassword: "Sahkan kata laluan", fullName: "Nama penuh", forgot: "Lupa kata laluan?", signUp: "Daftar", google: "Teruskan dengan Google", sendReset: "Hantar pautan tetapan semula",
  payOk: "Pembayaran berjaya", payVerified: "Pembayaran disahkan", orderDelivered: "Pesanan dihantar", orderReady: "Pesanan anda sudah siap", emailBody: "Buka pesanan anda untuk melihat butiran penghantaran.", payMethods: "FPX · Kad · E-dompet",
  payMethod: "Kaedah pembayaran", fpx: "Perbankan Dalam Talian FPX", fpxHint: "Bayar terus dari akaun bank anda", cardsLbl: "Kad kredit / debit", ewalletLbl: "E-dompet", noCard: "Tanpa kad",
  chooseBank: "Pilih bank anda", redirecting: "Mengalihkan ke bank anda…", approvePay: "Luluskan pembayaran", approveBtn: "Luluskan", viaFpx: "Dibayar melalui FPX", outNote: "Pilihan ini kehabisan stok buat masa ini. Sila semak semula nanti.",
  storeSetup: "Kedai sedang disediakan. Sila kembali tidak lama lagi.", notFound: "tidak ditemui", browse: "Lihat produk",
};
export type Lang = "en" | "ms";
const dict = { en, ms };
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string };
const C = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => { try { return (localStorage.getItem("bd.lang") as Lang) === "ms" ? "ms" : "en"; } catch { return "en"; } });
  useEffect(() => { document.documentElement.lang = lang === "ms" ? "ms" : "en"; }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem("bd.lang", l); } catch { /* ignore */ } };
  return <C.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</C.Provider>;
}
export const useT = () => { const c = useContext(C); if (!c) throw new Error("I18nProvider missing"); return c; };
