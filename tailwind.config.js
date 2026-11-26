/** @type {import('tailwindcss').Config} */
// Silta design tokens. See docs/DESIGN.md for when to use each one.
// System fonts only: the app is offline.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        paper: "#F3F6F4", // app background (pale mist)
        surface: "#FFFFFF", // cards, dialogs, inputs
        sunken: "#E6EDEA", // quiet wells, secondary button background
        edge: "#5E767A", // input and tile borders (3:1 on white)
        hairline: "#C9D6D1", // soft dividers only
        // Text
        ink: {
          DEFAULT: "#14262B", // body text (15:1 on paper)
          soft: "#3F5559", // hints and secondary text (7:1 on paper)
        },
        // Main brand colour: deep river teal
        river: {
          DEFAULT: "#0E5A63", // primary buttons, links, active tab (8:1 with white)
          dark: "#0A444B", // pressed state
          tint: "#DCEEEE", // selected tile, active tab background
        },
        // Warm light: praise, notes, highlights
        lantern: {
          DEFAULT: "#F2B544", // accent fill (use ink text on it)
          tint: "#FFF1D6", // praise and note panels
          ink: "#6B4200", // text on lantern-tint (7:1)
        },
        // Only for delete actions. Never for "wrong answer".
        brick: {
          DEFAULT: "#8A2D3B", // danger button (8:1 with white)
          dark: "#6F2230",
          tint: "#F8E6E8",
        },
        night: "#0B1517", // camera screens only
      },
      fontFamily: {
        // Both stacks cover Latin Extended (o', g') and Cyrillic on Android, iOS, Windows.
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Used for names, big sentences and screen titles: warm and easy to read.
        display: ["Georgia", "Noto Serif", "Droid Serif", "Times New Roman", "serif"],
      },
      fontSize: {
        caption: ["1rem", { lineHeight: "1.5rem" }], // 16px: hints only, never main text
        body: ["1.125rem", { lineHeight: "1.75rem" }], // 18px: all normal text
        lead: ["1.375rem", { lineHeight: "2rem" }], // 22px: button text, list names
        title: ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "-0.01em" }], // 28px
        display: ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.015em" }], // 36px
        hero: ["2.75rem", { lineHeight: "3.25rem", letterSpacing: "-0.02em" }], // 44px: names on match card
      },
      borderRadius: {
        btn: "1rem",
        tile: "1.25rem",
        card: "1.5rem",
        sheet: "2rem",
      },
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        tap: "3.5rem", // 56px minimum touch size
        "tap-lg": "4.5rem", // 72px big action tiles
        bar: "4.5rem", // bottom bar height
      },
      minHeight: {
        tap: "3.5rem",
        "tap-lg": "4.5rem",
      },
      minWidth: {
        tap: "3.5rem",
      },
      boxShadow: {
        lift: "0 2px 4px rgba(14, 90, 99, 0.08), 0 8px 24px rgba(14, 90, 99, 0.10)",
        bar: "0 -2px 12px rgba(20, 38, 43, 0.08)",
      },
      keyframes: {
        "rise-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
      },
      animation: {
        "rise-in": "rise-in 0.28s ease-out both",
        "fade-in": "fade-in 0.2s ease-out both",
        breathe: "breathe 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
