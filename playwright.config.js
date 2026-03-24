// @ts-check
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["html", { outputFolder: "e2e/playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:8765",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "**/mobile.spec.js",
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testMatch: "**/mobile.spec.js",
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] },
      testMatch: "**/mobile.spec.js",
    },
  ],
  globalSetup: "./e2e/global-setup.js",
  globalTeardown: "./e2e/global-teardown.js",
  webServer: {
    command: ".venv/bin/python manage.py runserver 8765 --noreload",
    url: "http://localhost:8765/login/",
    reuseExistingServer: true,
    timeout: 20000,
  },
});
