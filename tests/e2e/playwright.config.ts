import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../test-results/html' }],
  ],
  outputDir: '../../test-results/artifacts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    // Auth setup — generates storageState files
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },

    // Desktop tests — depend on auth setup
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-setup'],
    },

    // Mobile tests
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 14'] },
      testMatch: /responsive\.spec\.ts/,
      dependencies: ['auth-setup'],
    },

    // Tablet tests
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: /responsive\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
