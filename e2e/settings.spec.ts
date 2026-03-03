import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
  })

  test('renders settings page title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Settings|설정/)
  })

  test('shows monitoring settings card', async ({ page }) => {
    await expect(page.locator('h2', { hasText: /Monitoring|모니터링/ }).first()).toBeVisible()
  })

  test('interval days input exists', async ({ page }) => {
    const input = page.locator('input[type="number"]').first()
    await expect(input).toBeVisible()
    const value = await input.inputValue()
    expect(Number(value)).toBeGreaterThanOrEqual(1)
  })

  test('save button exists for admin', async ({ page }) => {
    const saveBtn = page.locator('button', { hasText: /Save|저장/ })
    await expect(saveBtn).toBeVisible()
  })
})
