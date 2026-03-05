import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/main.jsx"),
      name: "BabyBuddyShadcnPreview",
      formats: ["iife"],
      fileName: () => "preview"
    },
    rollupOptions: {
      output: {
        assetFileNames: "preview.[ext]"
      }
    }
  }
});
