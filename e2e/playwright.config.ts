import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  // Sequential: all tests share the same PostgreSQL database
  fullyParallel: false,
  workers: 1,
  // Absorb occasional toast-timing or Socket.IO race flakes
  retries: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    // Capture trace on first retry for debugging CI failures
    trace: 'on-first-retry',
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
  },
  globalSetup: './global-setup.ts',
  projects: [
    {
      // Use the system-installed Chrome to avoid needing to download Chromium.
      // Falls back gracefully to installed Edge if Chrome is unavailable.
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
