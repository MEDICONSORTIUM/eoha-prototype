// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 240000,
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Both list (terminal) and html (browser report) reporters
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // Live Server default port. Tests navigate relative to this.
    baseURL: 'http://localhost:5500',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',

    // Give external scripts (Leaflet, PapaParse CDN) time to load.
    // Route mocking bypasses the CSV fetch so this is mainly for Leaflet.
    actionTimeout: 60_000,
    navigationTimeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Replaces Live Server for test runs. Install once: npm i -D serve
  // For local dev you can still use Live Server — reuseExistingServer means
  // Playwright will use whatever is already on :5500 before spinning one up.
  webServer: {
    command: 'npx serve . -l 5500 --no-clipboard',
    url: 'http://localhost:5500',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});