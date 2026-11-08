export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { brand: { DEFAULT: "#E62117", dark: "#C81710" }, ink: "#171717", mute: "#6B7280", soft: "#F8F8F8", line: "#EEEEEE", ok: "#079669" },
    fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
    borderRadius: { card: "14px" },
  } },
  plugins: [],
};
