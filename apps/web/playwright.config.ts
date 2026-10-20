import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.E2E_PORT ?? 3100);
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: origin, ...devices["Desktop Chrome"] },
  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
    url: `${origin}/login`,
    reuseExistingServer: false,
  },
  reporter: "list",
});
