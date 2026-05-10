import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Auth setup — logs in via API and saves browser storage state
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // Authenticated tests — reuse the saved storage state
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 },
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  timeout: 60_000,
  expect: { timeout: 15_000 },
});
