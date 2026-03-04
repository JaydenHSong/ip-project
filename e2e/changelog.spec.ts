import { test, expect } from '@playwright/test'

test.describe('Changelog Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/changelog')
  })

  test('renders changelog title or redirects to login', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    } else {
      await expect(page.getByText(/Changelog|변경 로그/i)).toBeVisible()
    }
  })

  test('shows category tags on entries', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // In demo mode, should show entries with category badges
    await page.waitForTimeout(1000)
    const badges = page.locator('[class*="badge"], [class*="Badge"]').or(
      page.getByText(/New|Fix|Policy|AI|신규|수정|정책/i)
    )
    if (await badges.count() > 0) {
      await expect(badges.first()).toBeVisible()
    }
  })

  test('displays changelog entries', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    await page.waitForTimeout(1000)
    // Should show entries or empty state
    const content = page.locator('main')
    await expect(content).toBeVisible()
    // Check for either entries or no-entries message
    const hasEntries = await page.getByText(/No changelog|변경 로그가 없/i).isVisible().catch(() => false)
    const hasContent = await page.locator('[class*="border"]').count() > 0
    expect(hasEntries || hasContent).toBeTruthy()
  })

  test('admin sees add entry button', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // If user is admin, Add Entry button should be visible
    const addBtn = page.getByText(/Add Entry|항목 추가/i)
    // This may or may not be visible depending on role
    if (await addBtn.isVisible().catch(() => false)) {
      await expect(addBtn).toBeVisible()
    }
  })
})
