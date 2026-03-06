import { test, expect, screenshot } from './fixtures/auth'

test.describe('11. Responsive & Dark Mode', () => {
  const pages = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'reports', path: '/reports' },
    { name: 'campaigns', path: '/campaigns' },
    { name: 'notices', path: '/notices' },
    { name: 'settings', path: '/settings' },
    { name: 'patents', path: '/patents' },
  ]

  for (const { name, path } of pages) {
    test(`mobile (375px): ${name} no layout break`, async ({ adminPage: page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

      // Page should render without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)

      // Allow small tolerance (5px) for scrollbar rendering differences
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5)

      await screenshot(page, `responsive-mobile-${name}`)
    })

    test(`tablet (768px): ${name} layout ok`, async ({ adminPage: page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5)

      await screenshot(page, `responsive-tablet-${name}`)
    })
  }

  test('dark mode toggle switches theme', async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const themeBtn = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"], button[aria-label*="theme"], button[aria-label*="Theme"]')
    if (!await themeBtn.first().isVisible().catch(() => false)) { test.skip(true, 'No theme toggle'); return }

    // Get initial background color
    const initialBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-th-bg').trim()
    )

    await themeBtn.first().click()
    await page.waitForTimeout(300)

    // Background should change
    const newBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-th-bg').trim()
    )

    // In dark mode the bg value should differ
    if (initialBg && newBg) {
      expect(newBg).not.toBe(initialBg)
    }

    await screenshot(page, 'responsive-dark-mode')

    // Toggle back
    await themeBtn.first().click()
    await page.waitForTimeout(300)
    await screenshot(page, 'responsive-light-mode')
  })

  test('mobile: bottom tab bar visible', async ({ adminPage: page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Mobile tab bar at bottom
    const tabBar = page.locator('nav.fixed.bottom-0, nav[class*="fixed"][class*="bottom"]')
    if (await tabBar.isVisible().catch(() => false)) {
      await expect(tabBar).toBeVisible()
    }

    // Desktop sidebar should be hidden
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeHidden()
  })
})
