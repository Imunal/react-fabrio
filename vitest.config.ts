import { defineConfig } from "vitest/config";
import { defaultServerConditions } from "vite";

export default defineConfig({
  ssr: {
    resolve: { conditions: ["react-fabrio-source", ...defaultServerConditions] },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}"],
      reporter: ["text", "lcov", "html"],
    },
  },
});
