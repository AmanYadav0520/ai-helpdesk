import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  outputDir: "./e2e/test-results",
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }]],
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "bun run --cwd apps/server --env-file=.env.test src/index.ts",
      url: "http://localhost:3002/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bun run --cwd apps/web vite --port 5174",
      url: "http://localhost:5174",
      env: { VITE_API_URL: "http://localhost:3002" },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
