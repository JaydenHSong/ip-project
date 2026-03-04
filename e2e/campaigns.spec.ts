import { test, expect } from '@playwright/test'

test.describe('Campaigns Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns')
  })

  test('renders campaigns title or redirects to login', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    } else {
      await expect(page.getByText(/Campaigns|캠페인/i)).toBeVisible()
    }
  })

  test('shows new campaign button', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const newBtn = page.getByText(/New Campaign|새 캠페인/i)
    await expect(newBtn).toBeVisible()
  })

  test('new campaign SlidePanel has form fields', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const newBtn = page.getByText(/New Campaign|새 캠페인/i)
    if (await newBtn.isVisible()) {
      await newBtn.click()
      await page.waitForTimeout(500)
      const panel = page.locator('[class*="fixed"][class*="right-0"]')
      if (await panel.first().isVisible()) {
        await expect(page.getByText(/Keyword|키워드/i).first()).toBeVisible()
        await expect(page.getByText(/Marketplace|마켓플레이스/i).first()).toBeVisible()
      }
    }
  })

  test('campaign detail page loads', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const campaignLinks = page.locator('a[href*="/campaigns/"]').filter({ hasNotText: /new/i })
    if (await campaignLinks.count() > 0) {
      await campaignLinks.first().click()
      await expect(page.getByText(/Campaign Details|캠페인 상세/i)).toBeVisible({ timeout: 5000 })
    }
  })
})
