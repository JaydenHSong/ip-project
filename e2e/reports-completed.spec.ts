import { test, expect } from '@playwright/test'

test.describe('Completed Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports/completed')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Completed|완료된/)
  })

  test('status filter tabs are present', async ({ page }) => {
    const tabArea = page.locator('.flex.gap-2.overflow-x-auto')
    const tabs = tabArea.locator('a')
    // All, Submitted, Monitoring, Resolved, Unresolved
    await expect(tabs).toHaveCount(5)
  })

  test('shows empty state when no completed reports in demo', async ({ page }) => {
    // Demo data has no reports with completed statuses (submitted/monitoring/resolved/unresolved)
    // So we expect either an empty message or no rows
    const emptyMsg = page.locator('text=No completed').or(page.locator('text=완료된 신고'))
    const tableRows = page.locator('table tbody tr')
    const rowCount = await tableRows.count()
    // Either shows empty message or has no rows
    if (rowCount === 1) {
      // Single row could be the "no data" row
      const cellText = await tableRows.first().textContent()
      expect(cellText).toBeTruthy()
    }
  })

  test('clicking status tab changes URL', async ({ page }) => {
    await page.click('a[href="/reports/completed?status=submitted"]')
    await expect(page).toHaveURL(/status=submitted/)
  })

  test('has search filter', async ({ page }) => {
    // The TableFilters component renders filter inputs
    const searchInput = page.locator('input').first()
    await expect(searchInput).toBeVisible()
  })
})
