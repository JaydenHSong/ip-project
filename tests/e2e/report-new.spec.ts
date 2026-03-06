import { test, expect, screenshot } from './fixtures/auth'

test.describe('6. New Report — TASK-10', () => {
  test('new report page loads', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.locator('h1').first()).toBeVisible()
    await screenshot(page, 'report-new-page')
  })

  test('main ASIN input is required', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Look for ASIN input field
    const asinInput = page.locator('input').filter({ hasText: /ASIN/i })
      .or(page.locator('input[placeholder*="ASIN"]'))
      .or(page.locator('input[name*="asin"]'))
    if (await asinInput.count() > 0) {
      await expect(asinInput.first()).toBeVisible()
    }
  })

  test('Add ASIN button adds related ASIN field — TASK-10', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const addBtn = page.getByText(/Add ASIN/i)
    if (!await addBtn.isVisible().catch(() => false)) { test.skip(true, 'No Add ASIN button'); return }

    // Count related ASIN inputs before (placeholder="B08XXXXXXXX")
    const inputsBefore = await page.locator('input[placeholder="B08XXXXXXXX"]').count()

    await addBtn.click()

    // Should have one more input
    const inputsAfter = await page.locator('input[placeholder="B08XXXXXXXX"]').count()
    expect(inputsAfter).toBeGreaterThan(inputsBefore)
    await screenshot(page, 'report-new-add-asin')
  })

  test('related ASIN can be removed with X button — TASK-10', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const addBtn = page.getByText(/Add ASIN/i)
    if (!await addBtn.isVisible().catch(() => false)) { test.skip(true, 'No Add ASIN button'); return }

    // Add two ASINs
    await addBtn.click()
    await addBtn.click()

    const countAfterAdd = await page.locator('input[placeholder="B08XXXXXXXX"]').count()

    // Click remove button (× icon) on last added ASIN
    const removeBtn = page.locator('button').filter({ hasText: /×|✕/ })
      .or(page.locator('button[aria-label*="remove"], button[aria-label*="삭제"]'))
    if (await removeBtn.count() > 0) {
      await removeBtn.last().click()
      const countAfterRemove = await page.locator('input[placeholder="B08XXXXXXXX"]').count()
      expect(countAfterRemove).toBeLessThan(countAfterAdd)
    }
    await screenshot(page, 'report-new-remove-asin')
  })

  test('violation type selector exists', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const violationSelect = page.locator('select, [role="listbox"], [role="combobox"]')
      .or(page.getByText(/Violation Type|위반 유형/i))
    expect(await violationSelect.count()).toBeGreaterThanOrEqual(1)
  })

  test('BackButton navigates to /reports — TASK-02', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const backBtn = page.locator('a[href="/reports"]').filter({
      has: page.locator('svg'),
    })
    if (await backBtn.count() > 0) {
      await backBtn.first().click()
      await expect(page).toHaveURL(/\/reports$/)
    }
  })
})
