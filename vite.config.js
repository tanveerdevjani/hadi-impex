import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/app/",
  publicDir: false,
  build: { outDir: "dist/app", emptyOutDir: true, chunkSizeWarningLimit: 1200 },
  plugins: [react(), tailwindcss()],
});
