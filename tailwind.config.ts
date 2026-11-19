import type { Config } from "tailwindcss";

// Colors, type scale — one place, matching the locked spec. Swap the font
// stack for real Satoshi (self-hosted via next/font/local) when the actual
// font files are available; Plus Jakarta Sans is the placeholder used in
// the landing page artifact for the same reason (Satoshi isn't on Google
// Fonts, so it can't load in a browser-only preview).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ink: "#0F0F0F",
        bg: "#FAF9F6",
        champagne: "#D4C6A8",
        "champagne-deep": "#B8A67F",
        "champagne-ink": "#6F5F3C",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
