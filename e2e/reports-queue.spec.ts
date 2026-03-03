import { test, expect } from '@playwright/test'

test.describe('Reports Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Report Queue|신고 대기열/)
  })

  test('renders demo reports in table (non-archived)', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    // 4 non-archived reports: rpt-001 (pending_review), rpt-002 (draft), rpt-003 (approved), rpt-004 (rejected)
    // Reports page default filter excludes archived, and only shows draft/pending_review/approved/rejected
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('status filter tabs are present', async ({ page }) => {
    const tabArea = page.locator('.flex.gap-2.overflow-x-auto')
    const tabs = tabArea.locator('a')
    await expect(tabs).toHaveCount(6) // All, Draft, Pending, Approved, Submitted, Monitoring
  })

  test('clicking Draft tab filters reports', async ({ page }) => {
    await page.click('a[href="/reports?status=draft"]')
    await expect(page).toHaveURL(/status=draft/)
  })

  test('clicking Pending tab filters reports', async ({ page }) => {
    await page.click('a[href="/reports?status=pending_review"]')
    await expect(page).toHaveURL(/status=pending_review/)
  })

  test('search filter input exists', async ({ page }) => {
    // TableFilters renders inputs for search/filter
    const inputs = page.locator('input')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('search filter narrows results', async ({ page }) => {
    // Desktop search input is inside the hidden sm:flex container
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill('B0D1234567')
    // Wait for filter to apply
    await page.waitForTimeout(500)
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(1)
    // Verify the matching ASIN is visible in the table
    await expect(page.locator('table').getByText('B0D1234567').first()).toBeVisible()
  })

  test('clicking row opens Quick View SlidePanel', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()
  })

  test('Quick View shows violation info', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()
    await expect(panel.getByText('ASIN').first()).toBeVisible()
  })

  test('Quick View shows listing info', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel.getByText('US').or(panel.getByText('JP')).first()).toBeVisible()
  })

  test('Quick View has Details link', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    const detailLink = panel.locator('a[href^="/reports/rpt-"]')
    await expect(detailLink).toBeVisible()
  })

  test('SlidePanel closes on ESC', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  })

  test('SlidePanel closes on backdrop click', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const closeBtn = page.locator('button[aria-label="닫기"]')
    await expect(closeBtn).toBeVisible({ timeout: 5000 })

    // Click backdrop — use coordinates at left side to avoid hitting panel
    await page.mouse.click(10, 400)
    await expect(closeBtn).toBeHidden({ timeout: 5000 })
  })

  test('SlidePanel closes on X button', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()

    await panel.locator('button[aria-label="닫기"]').click()
    await expect(panel).toBeHidden()
  })

  test('New Report button opens SlidePanel', async ({ page }) => {
    const newBtn = page.locator('button', { hasText: /New Report|새 신고/ })
    await newBtn.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()
  })
})
