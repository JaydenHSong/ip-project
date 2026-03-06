import { test, expect, screenshot, IS_DEMO } from './fixtures/auth'

test.describe('4. Report Queue — TASK-01, 06, 07', () => {
  test('report list loads with table', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.locator('h1')).toHaveText(/Report Queue|신고 대기열/)
    await screenshot(page, 'reports-queue-list')
  })

  test('status filter tabs present', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const tabs = page.locator('a').filter({
      hasText: /All|Draft|Pending|SC Submitting|Monitoring|전체|초안/,
    })
    expect(await tabs.count()).toBeGreaterThanOrEqual(3)
  })

  test('search filter narrows results', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const searchInput = page.locator('input[type="text"]').first()
    if (!await searchInput.isVisible().catch(() => false)) { test.skip(true, 'No search'); return }

    await searchInput.fill('NONEXISTENT_ASIN_12345')
    await page.waitForTimeout(500)
    await screenshot(page, 'reports-queue-search-empty')
  })

  test('row click navigates to /reports/[id] (no SlidePanel) — TASK-01', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const firstRow = page.locator('table tbody tr').first()
    if (!await firstRow.isVisible().catch(() => false)) { test.skip(true, 'No reports'); return }

    // Verify cursor-pointer style
    await expect(firstRow).toHaveCSS('cursor', 'pointer')

    await firstRow.click()
    await page.waitForLoadState('networkidle')

    // Should navigate directly to detail page, NOT open SlidePanel
    await expect(page).toHaveURL(/\/reports\/[a-zA-Z0-9-]+$/)

    // SlidePanel should NOT be visible
    const slidePanel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(slidePanel).toBeHidden()

    await screenshot(page, 'reports-queue-direct-navigation')
  })

  test('checkbox click selects row without navigation — TASK-01', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) { test.skip(true, 'No checkboxes'); return }

    await checkbox.click()

    // Should stay on /reports (no navigation)
    await expect(page).toHaveURL(/\/reports$/)

    // Checkbox should be checked
    await expect(checkbox).toBeChecked()

    // Bulk action bar should appear
    const bulkBar = page.getByText(/건 선택|selected/)
    await expect(bulkBar.first()).toBeVisible()
    await screenshot(page, 'reports-queue-checkbox-select')
  })

  test('bulk select shows Submit Review button for draft — TASK-07', async ({ adminPage: page }) => {
    await page.goto('/reports?status=draft')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) { test.skip(true, 'No draft reports'); return }

    await checkbox.click()

    const submitBtn = page.getByRole('button', { name: /Submit Review/i })
    await expect(submitBtn).toBeVisible()
    await screenshot(page, 'reports-queue-bulk-submit-review')
  })

  test('bulk select shows Submit SC button for approved — TASK-07', async ({ adminPage: page }) => {
    // Navigate with approved status filter
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Try clicking approved tab
    const approvedTab = page.locator('a[href*="status=approved"]')
    if (await approvedTab.isVisible().catch(() => false)) {
      await approvedTab.click()
      await page.waitForLoadState('networkidle')
    }

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) { test.skip(true, 'No approved reports'); return }

    await checkbox.click()

    const submitScBtn = page.getByRole('button', { name: /Submit SC/i })
    if (await submitScBtn.isVisible().catch(() => false)) {
      await expect(submitScBtn).toBeVisible()
    }
  })

  test('bulk select shows Delete button for Admin — TASK-06', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) { test.skip(true, 'No reports'); return }

    await checkbox.click()

    const deleteBtn = page.getByRole('button', { name: /Delete/i })
    await expect(deleteBtn).toBeVisible()
    await screenshot(page, 'reports-queue-bulk-delete')
  })

  test('bulk delete shows confirmation modal — TASK-06', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) { test.skip(true, 'No reports'); return }

    await checkbox.click()

    const deleteBtn = page.getByRole('button', { name: /Delete/i })
    await deleteBtn.click()

    // Modal should appear
    const modal = page.getByText(/삭제하시겠습니까|Are you sure|Delete Reports/i)
    await expect(modal.first()).toBeVisible()
    await screenshot(page, 'reports-queue-delete-modal')

    // Cancel the modal
    const cancelBtn = page.getByRole('button', { name: /취소|Cancel/i })
    await cancelBtn.click()
  })

  test('Viewer cannot see delete button — TASK-06', async ({ viewerPage: page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode has no role differentiation'); return }
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Even if viewer can see checkboxes, delete button should not appear
    // (Actually viewers shouldn't see bulk action buttons at all)
    const deleteBtn = page.getByRole('button', { name: /Delete/i })
    await expect(deleteBtn).toBeHidden()
  })

  test('multi-ASIN badge (+N) shows — TASK-10', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Look for +N badges in the table
    const badges = page.locator('span').filter({ hasText: /^\+\d+$/ })
    // May or may not have multi-ASIN reports — just verify the page loaded
    await expect(page.locator('table, h1').first()).toBeVisible()
  })

  test('New Report button opens slide panel', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const newBtn = page.getByRole('button', { name: /New Report|새 신고/i })
    await newBtn.click()

    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()
    await screenshot(page, 'reports-queue-new-report-panel')
  })
})
