import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const webRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: webRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(webRoot, "src"),
      "@monitor/shared": resolve(webRoot, "../../packages/shared/src/index.ts")
    }
  },
  build: {
    outDir: resolve(webRoot, "dist"),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
