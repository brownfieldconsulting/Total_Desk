import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0B1D33", 800: "#11253C", 700: "#16324F", 600: "#1E4266", line: "#2B4A6B" },
        silver: { DEFAULT: "#B8C4CE", light: "#E4EAF0" },
        surface: "#F5F7FA",
        ink: "#152435",
        muted: "#5A6B7A",
        brand: { DEFAULT: "#F25C05", light: "#FF8A3D" },
      },
      boxShadow: {
        card: "0 1px 3px rgba(11,29,51,.08), 0 8px 24px rgba(11,29,51,.07)",
      },
      borderRadius: { card: "14px" },
    },
  },
  plugins: [],
};
export default config;
