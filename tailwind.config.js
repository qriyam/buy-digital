export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { brand: { DEFAULT: "#E62117", dark: "#C81710" }, ink: "#171717", mute: "#6B7280", soft: "#F8F8F8", line: "#EEEEEE", ok: "#079669" },
    fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
    borderRadius: { card: "14px" },
    keyframes: {
      float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
      fadeUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "none" } },
      slideIn: { from: { opacity: "0", transform: "translateX(-14px)" }, to: { opacity: "1", transform: "none" } },
      ring: { "0%": { boxShadow: "0 0 0 0 rgba(230,33,23,.45)" }, "70%,100%": { boxShadow: "0 0 0 12px rgba(230,33,23,0)" } },
      pop: { from: { opacity: "0", transform: "scale(.85)" }, to: { opacity: "1", transform: "none" } },
      draw: { from: { strokeDashoffset: "30" }, to: { strokeDashoffset: "0" } },
      bar: { from: { width: "0%" }, to: { width: "100%" } },
      fall: { "0%": { opacity: "1", transform: "translateY(-10px) rotate(0)" }, "100%": { opacity: "0", transform: "translateY(150px) rotate(280deg)" } },
      slideDown: { from: { opacity: "0", transform: "translateY(-24px)" }, to: { opacity: "1", transform: "none" } },
      ripple: { from: { opacity: ".9", transform: "scale(.4)" }, to: { opacity: "0", transform: "scale(1.7)" } },
      shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
    },
    animation: {
      float: "float 4s ease-in-out infinite", "fade-up": "fadeUp .7s ease both", "slide-in": "slideIn .6s ease both",
      ring: "ring 2s ease-out infinite", pop: "pop .4s ease both", draw: "draw .7s .25s ease forwards", bar: "bar 1.4s linear forwards",
      fall: "fall 1.7s ease-in forwards", "slide-down": "slideDown .6s ease both", ripple: "ripple .6s ease-out forwards", shimmer: "shimmer 2.4s linear infinite",
    },
  } },
  plugins: [],
};
