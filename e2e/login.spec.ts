import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows Google Sign In button', async ({ page }) => {
    const button = page.getByRole('button', { name: /sign in with google|google로 로그인/i })
    await expect(button).toBeVisible()
  })

  test('shows 4 feature icons on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    // The left panel features list has 4 items
    const features = page.locator('.space-y-4 > div')
    await expect(features).toHaveCount(4)
  })

  test('shows @spigen.com restriction text', async ({ page }) => {
    await expect(page.getByText(/spigen/i)).toBeVisible()
  })
})
