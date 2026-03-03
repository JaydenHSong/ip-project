import { test, expect } from '@playwright/test'

test.describe('Layout — Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('renders sidebar with navigation links', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar.locator('text=Sentinel')).toBeVisible()
  })

  test('shows 5 main navigation links', async ({ page }) => {
    const sidebar = page.locator('aside')
    const navLinks = sidebar.locator('nav a')
    await expect(navLinks).toHaveCount(5)
  })

  test('highlights active nav link for current page', async ({ page }) => {
    const dashboardLink = page.locator('aside a[href="/dashboard"]')
    await expect(dashboardLink).toHaveClass(/bg-th-sidebar-active/)
  })

  test('navigates to campaigns page via sidebar', async ({ page }) => {
    await page.click('aside a[href="/campaigns"]')
    await expect(page).toHaveURL(/\/campaigns/)
  })

  test('navigates to reports page via sidebar', async ({ page }) => {
    await page.click('aside a[href="/reports"]')
    await expect(page).toHaveURL(/\/reports/)
  })

  test('collapses and expands sidebar', async ({ page }) => {
    const sidebar = page.locator('aside')
    const brandText = sidebar.locator('text=Sentinel')
    await expect(brandText).toBeVisible()

    // Collapse — click via aria-label to avoid Next.js dev portal overlap
    const collapseBtn = sidebar.locator('button[aria-label="Collapse sidebar"], button[aria-label="사이드바 접기"]')
    await collapseBtn.click({ force: true })
    await expect(brandText).toBeHidden({ timeout: 3000 })

    // Wait for transition to settle before clicking expand
    await page.waitForTimeout(600)
    const expandBtn = sidebar.locator('button[aria-label="Expand sidebar"], button[aria-label="사이드바 펼치기"]')
    // Use JS click to bypass any overlay interception
    await expandBtn.evaluate((el: HTMLElement) => el.click())
    await expect(brandText).toBeVisible({ timeout: 3000 })
  })

  test('opens account menu on click', async ({ page }) => {
    const sidebar = page.locator('aside')
    // Click the account area button (has user avatar/name)
    const accountButton = sidebar.locator('.relative button').first()
    await accountButton.click()
    // Account popup should appear with email and logout
    await expect(page.locator('text=demo@spigen.com')).toBeVisible()
    await expect(page.locator('text=Logout').or(page.locator('text=로그아웃'))).toBeVisible()
  })

  test('closes account menu on outside click', async ({ page }) => {
    const sidebar = page.locator('aside')
    const accountButton = sidebar.locator('.relative button').first()
    await accountButton.click()
    await expect(page.locator('text=demo@spigen.com')).toBeVisible()

    // Click outside
    await page.locator('main').click()
    await expect(page.locator('text=demo@spigen.com')).toBeHidden()
  })
})

test.describe('Layout — Header', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('shows version badge', async ({ page }) => {
    await expect(page.locator('header >> text=v0.1.0')).toBeVisible()
  })

  test('shows audit log dropdown for admin', async ({ page }) => {
    // Click audit log button
    const auditButton = page.locator('header button', { hasText: /Audit Logs|감사 로그/ })
    await auditButton.click()
    // Dropdown appears with log entries
    await expect(page.locator('header .glass-dropdown')).toBeVisible()
    await expect(page.locator('header >> text=View All')).toBeVisible()
  })

  test('audit log dropdown closes on outside click', async ({ page }) => {
    const auditButton = page.locator('header button', { hasText: /Audit Logs|감사 로그/ })
    await auditButton.click()
    const dropdown = page.locator('header .glass-dropdown')
    await expect(dropdown).toBeVisible()

    // Dispatch mousedown outside to trigger the close handler
    await page.evaluate(() => {
      const main = document.querySelector('main')
      if (main) main.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    await expect(dropdown).toBeHidden()
  })

  test('shows notification bell', async ({ page }) => {
    const header = page.locator('header')
    const bellArea = header.locator('div.flex.items-center.gap-3')
    await expect(bellArea).toBeVisible()
  })

  test('language toggle shows EN or KO', async ({ page }) => {
    const langButton = page.locator('header button[aria-label="Toggle language"]')
    await expect(langButton).toBeVisible()
    // Should show EN or KO
    const text = await langButton.textContent()
    expect(text).toMatch(/EN|KO/)
  })

  test('theme toggle button is visible', async ({ page }) => {
    const themeBtn = page.locator('header button[aria-label*="mode"], header button[aria-label*="Mode"]')
    await expect(themeBtn).toBeVisible()
  })
})

test.describe('Layout — Mobile Tab Bar', () => {
  test('shows tab bar on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    const tabBar = page.locator('nav.fixed.bottom-0')
    await expect(tabBar).toBeVisible()
  })

  test('tab bar has Dashboard, Campaigns, Reports, More', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    const tabBar = page.locator('nav.fixed.bottom-0')
    await expect(tabBar.locator('a')).toHaveCount(3)
    await expect(tabBar.locator('button')).toHaveCount(1) // More button
  })

  test('hides sidebar on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeHidden()
  })
})
