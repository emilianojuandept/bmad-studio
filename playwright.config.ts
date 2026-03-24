import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.002,
      animations: 'disabled',
      fullPage: true,
    },
  },

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'off',
    trace: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
