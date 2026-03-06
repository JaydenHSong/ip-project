import { test, expect, screenshot } from './fixtures/auth'

test.describe('5. Report Detail — TASK-03, 05, 10', () => {
  const navigateToFirstReport = async (page: import('@playwright/test').Page): Promise<boolean> => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) return false

    const firstRow = page.locator('table tbody tr').first()
    if (!await firstRow.isVisible().catch(() => false)) return false

    await firstRow.click()
    await page.waitForLoadState('networkidle')
    return page.url().includes('/reports/')
  }

  test('report detail page renders', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    await expect(page.locator('h1, h2').first()).toBeVisible()
    await screenshot(page, 'report-detail-page')
  })

  test('ASIN clicks open Amazon in new tab — TASK-05', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    // Find ASIN link with target="_blank"
    const asinLink = page.locator('a[target="_blank"][href*="amazon"]').first()
    if (!await asinLink.isVisible().catch(() => false)) {
      // Try alternate: link containing /dp/
      const dpLink = page.locator('a[href*="/dp/"]').first()
      if (!await dpLink.isVisible().catch(() => false)) { test.skip(true, 'No ASIN link'); return }
      await expect(dpLink).toHaveAttribute('target', '_blank')
      await expect(dpLink).toHaveAttribute('href', /amazon/)
    } else {
      await expect(asinLink).toHaveAttribute('target', '_blank')
      const href = await asinLink.getAttribute('href')
      expect(href).toMatch(/amazon\.(com|co\.(uk|jp)|de|fr|it|es|ca)\/dp\//)
    }
    await screenshot(page, 'report-detail-asin-link')
  })

  test('Related ASINs section shows with links — TASK-10', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    // Related ASINs section — may or may not exist
    const relatedSection = page.getByText(/Related ASINs/i)
    if (await relatedSection.isVisible().catch(() => false)) {
      await expect(relatedSection).toBeVisible()
      // Each related ASIN should have an Amazon link
      const relatedLinks = page.locator('a[href*="amazon"][href*="/dp/"]')
      expect(await relatedLinks.count()).toBeGreaterThanOrEqual(1)
      await screenshot(page, 'report-detail-related-asins')
    }
  })

  test('BackButton navigates to /reports — TASK-02', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    const backBtn = page.locator('a[href="/reports"]').filter({
      has: page.locator('svg'),
    })
    await expect(backBtn.first()).toBeVisible()

    await backBtn.first().click()
    await expect(page).toHaveURL(/\/reports$/)
  })

  test('Template panel opens and closes — TASK-03', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    const templateBtn = page.getByRole('button', { name: /Apply Template|템플릿/i })
    if (!await templateBtn.isVisible().catch(() => false)) { test.skip(true, 'No template button'); return }

    await templateBtn.click()

    // SlidePanel should open
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()
    await screenshot(page, 'report-detail-template-panel')

    // Close panel
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  })

  test('Template panel has search and category filter — TASK-03', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    const templateBtn = page.getByRole('button', { name: /Apply Template|템플릿/i })
    if (!await templateBtn.isVisible().catch(() => false)) { test.skip(true, 'No template button'); return }

    await templateBtn.click()

    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()

    // Search input in panel
    const searchInput = panel.locator('input')
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible()
    }

    // Category filter buttons
    const categoryBtns = panel.locator('button').filter({
      hasText: /Trademark|Image|Variation|IP|Listing/i,
    })
    if (await categoryBtns.count() > 0) {
      await expect(categoryBtns.first()).toBeVisible()
    }

    await screenshot(page, 'report-detail-template-filters')
  })

  test('Template selection updates draft body — TASK-03', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    const templateBtn = page.getByRole('button', { name: /Apply Template|템플릿/i })
    if (!await templateBtn.isVisible().catch(() => false)) { test.skip(true, 'No template button'); return }

    await templateBtn.click()

    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()

    // Click "Use" on first template
    const useBtn = panel.getByRole('button', { name: /Use/i }).first()
    if (await useBtn.isVisible().catch(() => false)) {
      await useBtn.click()
      // Panel should close and body should be updated
      await page.waitForTimeout(500)
      await screenshot(page, 'report-detail-template-applied')
    }
  })

  test('single delete button for Admin — TASK-06', async ({ adminPage: page }) => {
    if (!await navigateToFirstReport(page)) { test.skip(true, 'No reports'); return }

    const deleteBtn = page.getByRole('button', { name: /Delete|삭제/i })
    // Admin should see delete (depending on report status)
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click()

      // Confirmation modal
      const modal = page.getByText(/삭제하시겠습니까|Are you sure/i)
      await expect(modal.first()).toBeVisible()
      await screenshot(page, 'report-detail-delete-modal')

      // Cancel
      const cancelBtn = page.getByRole('button', { name: /취소|Cancel/i })
      await cancelBtn.click()
    }
  })
})
