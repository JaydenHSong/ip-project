import { test, expect, screenshot } from './fixtures/auth'

test.describe('3. Campaigns', () => {
  test('campaign list loads', async ({ adminPage: page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.locator('h1').first()).toBeVisible()
    await screenshot(page, 'campaigns-list')
  })

  test('campaign list shows table or cards', async ({ adminPage: page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Desktop table or mobile cards
    const table = page.locator('table')
    const cards = page.locator('[class*="rounded-lg"][class*="border"]')
    const hasTable = await table.isVisible().catch(() => false)
    const hasCards = (await cards.count()) > 0

    expect(hasTable || hasCards).toBeTruthy()
  })

  test('status filter tabs exist', async ({ adminPage: page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const tabs = page.locator('a').filter({ hasText: /All|Active|Paused|Completed|전체|활성|일시중지|완료/ })
    expect(await tabs.count()).toBeGreaterThanOrEqual(2)
  })

  test('create campaign button visible for Editor+', async ({ adminPage: page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const createBtn = page.getByRole('button', { name: /New Campaign|새 캠페인|Create/i })
    .or(page.locator('a[href="/campaigns/new"]'))
    await expect(createBtn.first()).toBeVisible()
  })

  test('campaign detail page loads', async ({ adminPage: page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Click first campaign link
    const link = page.locator('a[href^="/campaigns/"]').first()
    if (!await link.isVisible().catch(() => false)) { test.skip(true, 'No campaigns'); return }

    await link.click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/campaigns\//)
    await screenshot(page, 'campaigns-detail')
  })

  test('campaign detail has BackButton — TASK-02', async ({ adminPage: page }) => {
    await page.goto('/campaigns')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const link = page.locator('a[href^="/campaigns/"]').first()
    if (!await link.isVisible().catch(() => false)) { test.skip(true, 'No campaigns'); return }

    await link.click()
    await page.waitForLoadState('networkidle')

    // BackButton has rounded-lg bg-th-bg-secondary styling
    const backBtn = page.locator('a[href="/campaigns"]').filter({
      has: page.locator('svg'),
    })
    await expect(backBtn.first()).toBeVisible()

    // Click back button
    await backBtn.first().click()
    await expect(page).toHaveURL(/\/campaigns$/)
  })
})
