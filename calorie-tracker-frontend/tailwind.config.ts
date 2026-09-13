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
        ink: {
          DEFAULT: "#18181B",
          muted: "#52525B",
          subtle: "#71717A",
        },
        line: "#E4E4E7",
        accent: {
          DEFAULT: "#18181B",
          hover: "#27272A",
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
      },
    },
  },
  plugins: [],
};
export default config;
