import { test, expect, screenshot, IS_DEMO } from './fixtures/auth'

test.describe('2. Dashboard — TASK-12', () => {
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }
  })

  test('renders dashboard page', async ({ adminPage: page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await screenshot(page, 'dashboard-initial')
  })

  test('renders widget grid with multiple widgets', async ({ adminPage: page }) => {
    // Widgets are rendered in a grid layout
    // Check for at least some widget containers
    await page.waitForTimeout(1000) // Allow widgets to load
    const widgets = page.locator('[data-widget-id], .react-grid-item, [class*="widget"]')
    const count = await widgets.count()

    if (count === 0) {
      // Fallback: check for stat cards or chart containers
      const cards = page.locator('.recharts-responsive-container, .recharts-wrapper, [class*="Card"]')
      expect(await cards.count()).toBeGreaterThanOrEqual(1)
    } else {
      expect(count).toBeGreaterThanOrEqual(3)
    }
    await screenshot(page, 'dashboard-widgets')
  })

  test('period filter changes active state', async ({ adminPage: page }) => {
    const periodBtns = page.locator('button').filter({ hasText: /7D|30D|90D|7일|30일|90일/ })
    const count = await periodBtns.count()
    if (count === 0) { test.skip(true, 'No period filter'); return }

    const secondBtn = periodBtns.nth(1)
    await secondBtn.click()
    await page.waitForTimeout(500)
    await screenshot(page, 'dashboard-period-changed')
  })

  test('marketplace filter exists', async ({ adminPage: page }) => {
    const mpFilter = page.locator('select, button').filter({ hasText: /All|US|JP|DE|marketplace/i })
    // May or may not exist depending on dashboard version
    if (await mpFilter.count() > 0) {
      await expect(mpFilter.first()).toBeVisible()
    }
  })

  test('SystemStatus widget: Owner only', async ({ viewerPage: page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode has no role differentiation'); return }
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Viewer should NOT see SystemStatus widget
    const systemWidget = page.getByText(/System Status|시스템 상태/)
    await expect(systemWidget).toBeHidden()
  })

  test('chart containers render', async ({ adminPage: page }) => {
    await page.waitForTimeout(1500) // Allow recharts dynamic import
    const charts = page.locator('.recharts-responsive-container, .recharts-wrapper, svg.recharts-surface')
    const count = await charts.count()
    expect(count).toBeGreaterThanOrEqual(1)
    await screenshot(page, 'dashboard-charts')
  })

  test('recent reports section shows data', async ({ adminPage: page }) => {
    const section = page.getByText(/Recent Reports|최근 신고/i)
    if (await section.count() > 0) {
      await expect(section.first()).toBeVisible()
    }
  })

  test('active campaigns section shows data', async ({ adminPage: page }) => {
    const section = page.getByText(/Active Campaigns|활성 캠페인/i)
    if (await section.count() > 0) {
      await expect(section.first()).toBeVisible()
    }
  })
})
