import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works at chetanstha.github.io/job-fit-studio/ and anywhere else.
// ES2022 target because pdf.js uses top-level await.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: "es2022", chunkSizeWarningLimit: 1500 },
  optimizeDeps: { esbuildOptions: { target: "es2022" } },
});
