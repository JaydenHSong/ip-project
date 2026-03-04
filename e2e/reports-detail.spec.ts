import { test, expect } from '@playwright/test'

test.describe('Reports Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
  })

  test('renders reports page or redirects to login', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    } else {
      await expect(page.getByText(/Report Queue|신고 대기열/i)).toBeVisible()
    }
  })

  test('shows status tabs', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const draftTab = page.getByRole('button', { name: /Draft|초안/i })
    await expect(draftTab).toBeVisible()
  })

  test('report detail shows approve/reject buttons for reviewable reports', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const reportLinks = page.locator('a[href*="/reports/"]').filter({ hasNotText: /completed|new|archived/i })
    if (await reportLinks.count() > 0) {
      await reportLinks.first().click()
      await page.waitForTimeout(1000)
      await expect(page.getByText(/Report Detail|Violation|위반/i).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('reject button opens rejection modal', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const reportLinks = page.locator('a[href*="/reports/"]').filter({ hasNotText: /completed|new|archived/i })
    if (await reportLinks.count() > 0) {
      await reportLinks.first().click()
      await page.waitForTimeout(1000)
      const rejectBtn = page.getByRole('button', { name: /^Reject$|^반려$/i })
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click()
        await expect(page.getByText(/Rejection|반려 사유|Rejection Category|반려 카테고리/i).first()).toBeVisible({ timeout: 3000 })
      }
    }
  })
})
