import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const isRemote = !BASE_URL.includes('localhost')
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/html' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    ...(isRemote && bypassSecret
      ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypassSecret } }
      : {}),
  },
  projects: [
    // Auth setup
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/ },

    // Desktop
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-setup'],
    },

    // Mobile
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 14'] },
      testMatch: /responsive\.spec\.ts/,
      dependencies: ['auth-setup'],
    },

    // Tablet
    {
      name: 'tablet-ipad',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: /responsive\.spec\.ts/,
      dependencies: ['auth-setup'],
    },
  ],
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: process.env.DEMO_MODE === 'true' ? 'DEMO_MODE=true pnpm dev' : 'pnpm dev',
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }),
})
