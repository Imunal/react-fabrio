import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset({ target: "19", panicThreshold: "all_errors" })] }),
  ],
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
    rolldownOptions: {
      external: [/^react(?:-dom)?(?:\/|$)/, /^@react-fabrio\//, /^react-aria-components(?:\/|$)/],
    },
  },
});
