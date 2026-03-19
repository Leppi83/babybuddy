import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.js"],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  base: "/static/babybuddy/ant/",
  build: {
    outDir: "../babybuddy/static/babybuddy/ant",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/main.jsx"),
      output: {
        entryFileNames: "app.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "app.[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
          if (id.includes("/src/pages/DashboardPages")) {
            return "page-dashboard";
          }
          if (id.includes("/src/pages/GeneralPages")) {
            return "page-general";
          }
        },
      },
    },
  },
});
