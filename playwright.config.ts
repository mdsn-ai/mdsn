import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3123",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build --workspace @mdsnai/sdk && PORT=3123 npx tsx examples/demo-host/server.ts",
    url: "http://127.0.0.1:3123/guestbook.md",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
