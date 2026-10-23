import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  use: { baseURL: "http://localhost:3000", browserName: "chromium" },
  webServer: {
    command: "node scripts/serve.mjs",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
