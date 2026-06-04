import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes asset paths relative so the build works on both
// Vercel (root) and GitHub Pages (subpath like /repo-name/).
export default defineConfig({
  plugins: [react()],
  base: "./",
});
