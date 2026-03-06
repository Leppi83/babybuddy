import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "../babybuddy/static/babybuddy/ant",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/main.jsx"),
      name: "BabyBuddyAntApp",
      formats: ["iife"],
      fileName: () => "app.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "app.[ext]",
      },
    },
  },
});
