import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  root: "app",
  plugins: [solid(), viteSingleFile()],
  build: { outDir: "../dist", emptyOutDir: true, target: "es2022" },
});
