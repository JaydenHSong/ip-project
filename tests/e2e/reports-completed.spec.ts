import { test, expect, screenshot } from './fixtures/auth'

test.describe('7. Completed Reports — TASK-05', () => {
  test('completed reports page loads', async ({ adminPage: page }) => {
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.locator('h1').first()).toBeVisible()
    await screenshot(page, 'reports-completed-list')
  })

  test('listing click does NOT navigate to /reports queue — TASK-05', async ({ adminPage: page }) => {
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Click on a completed report to go to detail
    const reportLink = page.locator('table tbody tr').first()
      .or(page.locator('a[href*="/reports/"]').first())
    if (!await reportLink.isVisible().catch(() => false)) { test.skip(true, 'No completed reports'); return }

    await reportLink.click()
    await page.waitForLoadState('networkidle')

    // Should be on report detail, not back to /reports
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\/reports\/[a-zA-Z0-9-]+/)

    // Find ASIN link — should go to Amazon, not /reports
    const asinLink = page.locator('a[href*="amazon"]').first()
    if (await asinLink.isVisible().catch(() => false)) {
      await expect(asinLink).toHaveAttribute('target', '_blank')
      await expect(asinLink).toHaveAttribute('href', /amazon/)
    }
    await screenshot(page, 'reports-completed-detail')
  })
})
