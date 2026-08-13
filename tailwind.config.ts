import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { brand: { DEFAULT: "#4f46e5", 50:"#eef2ff",100:"#e0e7ff",600:"#4f46e5",700:"#4338ca" } },
  } },
  plugins: [],
} satisfies Config;
