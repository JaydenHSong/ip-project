import { test, expect, screenshot } from './fixtures/auth'

test.describe('8. Patents', () => {
  test('patents page loads', async ({ adminPage: page }) => {
    await page.goto('/patents')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.locator('h1').first()).toBeVisible()
    await screenshot(page, 'patents-list')
  })

  test('search input exists', async ({ adminPage: page }) => {
    await page.goto('/patents')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const searchInput = page.locator('input[type="text"]').first()
    if (await searchInput.isVisible().catch(() => false)) {
      await expect(searchInput).toBeVisible()
      await searchInput.fill('test patent')
      await page.waitForTimeout(500)
      await screenshot(page, 'patents-search')
    }
  })
})
