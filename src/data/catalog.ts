// PLACEHOLDER demo data. Prices are NOT real offers. In production this comes from the database
// and every price is recalculated on the server at checkout.
export type Variant = { id: string; label: string; price: number };
export type Category = { slug: string; name: string; blurb: string; icon: string };
export type Product = {
  slug: string; name: string; category: string; blurb: string; description: string;
  delivery: "instant" | "manual"; available: boolean; variants: Variant[]; featured?: boolean;
};

export const categories: Category[] = [
  { slug: "streaming", name: "Streaming", blurb: "Video and music subscriptions", icon: "Tv" },
  { slug: "education", name: "Education", blurb: "Learning apps and courses", icon: "GraduationCap" },
  { slug: "ai-tools", name: "AI Tools", blurb: "Assistants and AI subscriptions", icon: "Sparkles" },
  { slug: "software", name: "Software", blurb: "Office and creative software", icon: "AppWindow" },
  { slug: "gift-cards", name: "Gift Cards", blurb: "Store and platform credit", icon: "Gift" },
  { slug: "gaming", name: "Gaming", blurb: "In-game currency and top-ups", icon: "Gamepad2" },
  { slug: "productivity", name: "Productivity", blurb: "Tools for work and study", icon: "ListChecks" },
  { slug: "other", name: "Other Digital Products", blurb: "Everything else digital", icon: "Package" },
];

const v = (id: string, label: string, price: number): Variant => ({ id, label, price });
const base = "Delivery details and terms are confirmed on this page before you pay. Eligibility for refunds follows our Refund Policy.";

export const products: Product[] = [
  { slug: "netflix", name: "Netflix", category: "streaming", blurb: "Streaming subscription", description: "Streaming subscription fulfilled through authorised channels. " + base, delivery: "manual", available: true, featured: true, variants: [v("1m", "1 Month", 26.9), v("3m", "3 Months", 80.7)] },
  { slug: "youtube-premium", name: "YouTube Premium", category: "streaming", blurb: "Ad-free video and music", description: "Ad-free viewing subscription. " + base, delivery: "manual", available: true, featured: true, variants: [v("1m", "1 Month", 18.9)] },
  { slug: "duolingo-plus", name: "Duolingo Plus", category: "education", blurb: "Language learning plan", description: "Language learning subscription. " + base, delivery: "manual", available: true, featured: true, variants: [v("1m", "1 Month", 49.9)] },
  { slug: "chatgpt-plus", name: "ChatGPT Plus", category: "ai-tools", blurb: "AI assistant subscription", description: "AI assistant subscription. " + base, delivery: "manual", available: true, featured: true, variants: [v("1m", "1 Month", 79)] },
  { slug: "microsoft-365", name: "Microsoft 365", category: "software", blurb: "Office apps and cloud storage", description: "Office suite subscription. " + base, delivery: "manual", available: true, featured: true, variants: [v("1y", "1 Year", 59)] },
  { slug: "google-play-gift-card", name: "Google Play Gift Card", category: "gift-cards", blurb: "Credit for apps and games", description: "Redeemable code delivered after verified payment. " + base, delivery: "instant", available: true, featured: true, variants: [v("10", "RM 10", 10), v("20", "RM 20", 20), v("50", "RM 50", 50), v("100", "RM 100", 100)] },
  { slug: "adobe-creative-cloud", name: "Adobe Creative Cloud", category: "software", blurb: "Creative apps subscription", description: "Creative software subscription. " + base, delivery: "manual", available: true, featured: true, variants: [v("1m", "1 Month", 89)] },
  { slug: "free-fire-diamonds", name: "Free Fire Diamonds", category: "gaming", blurb: "In-game currency top-up", description: "In-game currency top-up. " + base, delivery: "instant", available: true, featured: true, variants: [v("a", "Starter pack", 10)] },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const fromPrice = (p: Product) => Math.min(...p.variants.map((x) => x.price));
