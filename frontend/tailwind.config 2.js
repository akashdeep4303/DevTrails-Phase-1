/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        vigil: {
          bg: "#f0f9ff",
          canvas: "#f8fafc",
          surface: "#ffffff",
          "surface-muted": "#e0f2fe",
          border: "#e2e8f0",
          "border-strong": "#cbd5e1",
          muted: "#64748b",
          heading: "#0f172a",
          accent: "#0284c7",
          "accent-light": "#38bdf8",
          "accent-soft": "#e0f2fe",
          success: "#059669",
          warning: "#d97706",
          danger: "#dc2626",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 10px 40px -10px rgb(14 165 233 / 0.15), 0 4px 12px -2px rgb(15 23 42 / 0.08)",
        nav: "0 1px 0 0 rgb(226 232 240 / 0.9)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
