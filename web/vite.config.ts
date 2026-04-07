import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": new URL("../shared/src", import.meta.url).pathname,
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});