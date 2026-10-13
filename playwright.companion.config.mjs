import { defineConfig } from "@playwright/test";

const built = process.env.COMPANION_BUILT === "1";
export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "companion.spec.mjs",
    "leveling.spec.mjs",
    "profile-import.spec.mjs",
  ],
  workers: 1,
  timeout: 45_000,
  reporter: [["list"]],
  use: {
    baseURL: built
      ? "http://127.0.0.1:5174/companion/"
      : "http://127.0.0.1:5173/",
    browserName: "chromium",
    actionTimeout: 10_000,
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: built ? "npm run preview" : "npm run dev -- --port 5173",
    url: built ? "http://127.0.0.1:5174/companion/" : "http://127.0.0.1:5173/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
  },
});
