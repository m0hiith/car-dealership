import { defineConfig, devices } from '@playwright/test';

const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end coverage of the acceptance flow (PRODUCT_SPEC §19): admin adds
 * and publishes a car, it appears on the public site, a lead comes in, the
 * car is marked sold and leaves the listings. Runs against a real (dev)
 * Supabase project via .env.local — see tests/e2e/README.md.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
  },
});
