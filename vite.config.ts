import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cloudflare Pages: static SPA. The _redirects file ensures /admin works on refresh.
export default defineConfig({
  plugins: [react()],
  base: "./"
});
