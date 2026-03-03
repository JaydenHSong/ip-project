import { test, expect } from '@playwright/test'

test.describe('Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/audit-logs')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Audit Logs|감사 로그/)
  })

  test('renders 6 demo audit logs', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(6)
  })

  test('action filter tabs are present', async ({ page }) => {
    const tabArea = page.locator('.flex.gap-2.overflow-x-auto')
    const tabs = tabArea.locator('a')
    // All + create/update/delete/approve/reject = 6
    await expect(tabs).toHaveCount(6)
  })

  test('clicking Create filter shows create actions', async ({ page }) => {
    await page.click('a[href="/audit-logs?action=create"]')
    await expect(page).toHaveURL(/action=create/)
    // Should show only create logs (2 in demo data)
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(2)
  })

  test('shows user name in log entries', async ({ page }) => {
    await expect(page.locator('table >> text=Demo Admin').first()).toBeVisible()
  })

  test('shows action badges', async ({ page }) => {
    // Check that action badges like "create", "approve" etc are visible
    await expect(page.locator('table >> text=create').first()).toBeVisible()
  })
})
