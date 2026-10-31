import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/backend": path.resolve(__dirname, "./backend"),
      "@/frontend": path.resolve(__dirname, "./frontend"),
      "@/database": path.resolve(__dirname, "./database"),
      "@/lib": path.resolve(__dirname, "./backend"),
      "@/components": path.resolve(__dirname, "./frontend/components"),
    },
  },
});
