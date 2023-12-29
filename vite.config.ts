import { defineConfig } from "vite";
import certification from "./scripts/certification";

export default defineConfig({
  server: {
    port: 8080,
    strictPort: true,
    open: true,
    https: certification,
  },
});
