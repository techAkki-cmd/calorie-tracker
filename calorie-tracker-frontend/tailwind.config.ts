import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAFA",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#09090B",
          muted: "#52525B",
          subtle: "#71717A",
        },
        line: "#E4E4E7",
        accent: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "0.375rem",
        DEFAULT: "0.5rem",
        md: "0.625rem",
        lg: "0.75rem",
        xl: "0.75rem",
      },
      boxShadow: {
        hairline: "0 1px 0 0 rgb(24 24 27 / 0.04)",
        panel: "0 1px 2px rgb(15 23 42 / 0.04), 0 16px 40px -24px rgb(15 23 42 / 0.22)",
        focus: "0 0 0 3px rgb(15 23 42 / 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
