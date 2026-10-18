import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defaultClientConditions, defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset({ target: "19", panicThreshold: "all_errors" })] }),
    tailwindcss(),
  ],
  resolve: { conditions: ["react-fabrio-source", ...defaultClientConditions] },
});
