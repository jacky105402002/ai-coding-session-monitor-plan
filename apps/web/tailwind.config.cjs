/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./apps/web/index.html", "./apps/web/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(112 12% 84%)",
        background: "hsl(72 16% 96%)",
        foreground: "hsl(152 18% 11%)",
        muted: "hsl(140 8% 43%)",
        card: "hsl(0 0% 100%)"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(24, 33, 29, 0.08)"
      }
    }
  },
  plugins: []
};
