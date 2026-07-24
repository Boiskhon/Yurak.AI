import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-сервер фронтенда проксирует /api на локальный backend (порт 8756),
// поэтому в коде можно обращаться к относительным путям /api/... .
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8756",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
