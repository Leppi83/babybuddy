/** @type {import('tailwindcss').Config} */
export default {
  prefix: "bb-",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        card: "#1e293b",
        muted: "#94a3b8",
        accent: "#38bdf8"
      }
    }
  },
  plugins: []
};
