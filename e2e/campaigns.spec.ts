import { test, expect } from '@playwright/test'

test.describe('Campaigns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns')
  })

  test('renders page title', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Campaigns|캠페인/)
  })

  test('renders 4 demo campaigns in table', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(4)
  })

  test('shows campaign keywords in table', async ({ page }) => {
    const table = page.locator('table')
    await expect(table.getByText('spigen iphone 16 case')).toBeVisible()
    await expect(table.getByText('spigen galaxy s25 ultra')).toBeVisible()
  })

  test('status filter tabs show All/Active/Paused/Completed', async ({ page }) => {
    const filterArea = page.locator('.flex.gap-2.overflow-x-auto')
    const tabs = filterArea.locator('a')
    await expect(tabs).toHaveCount(4)
  })

  test('clicking Active filter shows only active campaigns', async ({ page }) => {
    await page.click('a[href="/campaigns?status=active"]')
    await expect(page).toHaveURL(/status=active/)
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(2)
  })

  test('clicking Paused filter shows only paused campaigns', async ({ page }) => {
    await page.click('a[href="/campaigns?status=paused"]')
    await expect(page).toHaveURL(/status=paused/)
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(1)
  })

  test('clicking campaign row navigates to detail page', async ({ page }) => {
    // Use the second row to avoid potential issues with first row
    const rows = page.locator('table tbody tr')
    const firstRow = rows.first()
    await firstRow.click()
    await expect(page).toHaveURL(/\/campaigns\/camp-/)
  })

  test('New Campaign button opens SlidePanel', async ({ page }) => {
    // There are two buttons: mobile (md:hidden) and desktop (hidden md:inline-flex)
    // Use the visible one by checking visibility
    const newBtn = page.getByRole('button', { name: /New Campaign|새 캠페인/ }).last()
    await newBtn.click()
    // SlidePanel should appear (wait for animation)
    const panel = page.locator('button[aria-label="닫기"]').locator('..')
    await expect(page.locator('button[aria-label="닫기"]')).toBeVisible({ timeout: 5000 })
  })

  test('SlidePanel closes on X button', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /New Campaign|새 캠페인/ }).last()
    await newBtn.click()
    await expect(page.locator('button[aria-label="닫기"]')).toBeVisible({ timeout: 5000 })

    // Close via X button
    await page.locator('button[aria-label="닫기"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('button[aria-label="닫기"]')).toBeHidden()
  })

  test('SlidePanel closes on backdrop click', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /New Campaign|새 캠페인/ }).last()
    await newBtn.click()
    await expect(page.locator('button[aria-label="닫기"]')).toBeVisible({ timeout: 5000 })

    // Click backdrop (the div with aria-hidden=true)
    await page.locator('div[aria-hidden="true"]').first().click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.locator('button[aria-label="닫기"]')).toBeHidden()
  })
})
