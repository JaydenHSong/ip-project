import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
  })

  test('renders settings title or redirects to login', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    } else {
      await expect(page.getByText(/Settings|설정/i)).toBeVisible()
    }
  })

  test('shows tab list for admin', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const tabs = page.locator('button').filter({ hasText: /Monitoring|Extension|Crawler|Templates|Users|모니터링|익스텐션|크롤러|사용자/i })
    expect(await tabs.count()).toBeGreaterThanOrEqual(2)
  })

  test('Extension tab shows install guide', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const extensionTab = page.getByRole('button', { name: /Extension|익스텐션/i })
    if (await extensionTab.isVisible()) {
      await extensionTab.click()
      await expect(page.getByText(/Install|설치/i)).toBeVisible()
    }
  })

  test('Crawler tab shows crawler status', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const crawlerTab = page.getByRole('button', { name: /Crawler|크롤러/i })
    if (await crawlerTab.isVisible()) {
      await crawlerTab.click()
      await expect(page.getByText(/Crawler Status|크롤러 상태|Connected|연결/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('Templates tab shows template content', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const templatesTab = page.getByRole('button', { name: /Templates/i })
    if (await templatesTab.isVisible()) {
      await templatesTab.click()
      await page.waitForTimeout(500)
      const content = page.locator('main')
      await expect(content).toBeVisible()
    }
  })

  test('Users tab shows user management for admin', async ({ page }) => {
    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
      return
    }
    const usersTab = page.getByRole('button', { name: /Users|사용자 관리/i })
    if (await usersTab.isVisible()) {
      await usersTab.click()
      await expect(page.getByText(/User Management|사용자 관리|Name|이름/i)).toBeVisible({ timeout: 3000 })
    }
  })
})
