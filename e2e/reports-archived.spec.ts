import { test, expect } from '@playwright/test'

test.describe('Archived Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports/archived')
  })

  test('renders archived reports page title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Archived|아카이브/)
  })

  test('shows archived report (rpt-007)', async ({ page }) => {
    const table = page.locator('table')
    await expect(table.getByText('B0D3456789')).toBeVisible()
  })

  test('shows archive reason', async ({ page }) => {
    const table = page.locator('table')
    await expect(table.getByText('Monitoring 60 days', { exact: false })).toBeVisible()
  })

  test('clicking row opens SlidePanel', async ({ page }) => {
    const row = page.locator('table tbody tr').first()
    await row.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel).toBeVisible()
  })

  test('SlidePanel shows violation info', async ({ page }) => {
    const row = page.locator('table tbody tr').first()
    await row.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel.getByText('ASIN').first()).toBeVisible()
  })

  test('SlidePanel shows archive reason', async ({ page }) => {
    const row = page.locator('table tbody tr').first()
    await row.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    await expect(panel.getByText('Monitoring 60 days', { exact: false }).first()).toBeVisible()
  })

  test('Unarchive button exists in table', async ({ page }) => {
    const table = page.locator('table')
    const unarchiveBtn = table.locator('button', { hasText: /Unarchive|아카이브 해제/ })
    await expect(unarchiveBtn.first()).toBeVisible()
  })

  test('SlidePanel has Unarchive button', async ({ page }) => {
    const row = page.locator('table tbody tr').first()
    await row.click()
    const panel = page.locator('[class*="fixed"][class*="inset-y-0"][class*="right-0"]')
    const unarchiveBtn = panel.locator('button', { hasText: /Unarchive|아카이브 해제/ })
    await expect(unarchiveBtn).toBeVisible()
  })
})
