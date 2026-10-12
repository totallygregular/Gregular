import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [react()],
  build: { outDir: "../dist/companion", emptyOutDir: true },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
