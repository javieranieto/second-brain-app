import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Sitio estatico plano para Cloudflare Pages. Sin servidor, sin funciones.
    outDir: "dist",
  },
});
