/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4ede0",
        ink: "#2a2419",
        "ink-muted": "#6b5a3e",
        accent: "#c44827",
        good: "#4a6b3e",
        sky: "#3b6aa3",
      },
      fontFamily: {
        display: ['"Bodoni Moda"', "serif"],
        body: ['"EB Garamond"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
