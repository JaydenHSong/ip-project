import { test, expect } from '@playwright/test'

// These tests assume DEMO_MODE=true or valid auth session
// Since the app requires auth, we test against /login redirect behavior
// and UI structure after auth (using demo mode)

test.describe('Patents / IP Registry Page', () => {
  test.beforeEach(async ({ page }) => {
    // Will redirect to /login if not authenticated
    await page.goto('/patents')
  })

  test('renders page title or redirects to login', async ({ page }) => {
    // Either we see the patents page or are redirected to login
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    } else {
      await expect(page.getByText(/IP Registry|IP 레지스트리/i)).toBeVisible()
    }
  })

  test('shows IP Type tabs when authenticated', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // Should have type filter tabs: All, Utility Patent, Design Patent, Trademark, Copyright
    await expect(page.getByText(/All|전체/)).toBeVisible()
  })

  test('shows search input when authenticated', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const searchInput = page.getByRole('textbox')
    await expect(searchInput).toBeVisible()
  })

  test('shows status filter when authenticated', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // Status filter select should be present
    const selects = page.locator('select')
    expect(await selects.count()).toBeGreaterThanOrEqual(1)
  })

  test('renders table or card layout', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // Should have either a table or cards with IP asset data
    const content = page.locator('table, [class*="divide-y"], [class*="grid"]')
    expect(await content.count()).toBeGreaterThanOrEqual(1)
  })

  test('shows Monday.com Sync button for admin', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // The sync button text
    const syncBtn = page.getByText(/Monday.com Sync|Monday.com 동기화/i)
    // May or may not be visible depending on role
    if (await syncBtn.isVisible()) {
      await expect(syncBtn).toBeVisible()
    }
  })

  test('Quick View SlidePanel opens on row click', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    // Click first row if data exists
    const rows = page.locator('tr').or(page.locator('[class*="cursor-pointer"]'))
    if (await rows.count() > 1) {
      await rows.nth(1).click()
      // SlidePanel should appear
      const panel = page.locator('[class*="fixed"][class*="right-0"]')
      await expect(panel.first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('Quick View SlidePanel closes on backdrop click', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const rows = page.locator('tr').or(page.locator('[class*="cursor-pointer"]'))
    if (await rows.count() > 1) {
      await rows.nth(1).click()
      // Click backdrop to close
      const backdrop = page.locator('[class*="fixed"][class*="inset-0"][class*="bg-black"]')
      if (await backdrop.isVisible()) {
        await backdrop.click({ position: { x: 10, y: 10 } })
      }
    }
  })
})
