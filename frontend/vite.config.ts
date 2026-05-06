import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Build output goes directly into the Go embed path so `go build` picks it up.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, "../internal/api/httpserver/static"),
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.[hash].js",
        chunkFileNames: "assets/chunk.[hash].js",
        assetFileNames: "assets/[name].[hash][extname]",
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": "http://localhost:8080",
      "/healthz": "http://localhost:8080",
      "/readyz": "http://localhost:8080",
    },
  },
});
