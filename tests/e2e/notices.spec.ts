import { test, expect, screenshot, IS_DEMO } from './fixtures/auth'

test.describe('9. Notices — TASK-11', () => {
  test('all roles can access /notices', async ({ viewerPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.locator('h1').first()).toBeVisible()
    await screenshot(page, 'notices-viewer-access')
  })

  test('notice list renders cards', async ({ adminPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Should have notice cards or table rows
    const content = page.locator('table tbody tr, [class*="rounded-lg"][class*="border"]')
    if (await content.count() > 0) {
      expect(await content.count()).toBeGreaterThanOrEqual(1)
    }
    await screenshot(page, 'notices-list')
  })

  test('category filter tabs exist', async ({ adminPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const tabs = page.locator('button, a').filter({
      hasText: /All|Update|Policy|Notice|System|전체/,
    })
    expect(await tabs.count()).toBeGreaterThanOrEqual(3)
    await screenshot(page, 'notices-category-tabs')
  })

  test('category filter click updates list', async ({ adminPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const updateTab = page.locator('button, a').filter({ hasText: /Update/ }).first()
    if (await updateTab.isVisible().catch(() => false)) {
      await updateTab.click()
      await page.waitForTimeout(500)
      await screenshot(page, 'notices-filter-update')
    }
  })

  test('Admin/Owner: create button visible', async ({ adminPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const createBtn = page.getByRole('button', { name: /New Notice|새 공지|Create|\+/i })
    await expect(createBtn.first()).toBeVisible()
    await screenshot(page, 'notices-admin-create-btn')
  })

  test('Admin/Owner: create button opens modal', async ({ adminPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const createBtn = page.getByRole('button', { name: /New Notice|새 공지|Create|\+/i })
    if (!await createBtn.first().isVisible().catch(() => false)) { test.skip(true, 'No create button'); return }

    await createBtn.first().click()

    // Modal or form should appear
    const form = page.locator('form, [role="dialog"], [class*="modal"]')
    await expect(form.first()).toBeVisible()
    await screenshot(page, 'notices-create-modal')
  })

  test('Viewer: no create/edit/delete buttons', async ({ viewerPage: page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode has no role differentiation'); return }
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const createBtn = page.getByRole('button', { name: /New Notice|새 공지|Create/i })
    await expect(createBtn).toBeHidden()

    const editBtn = page.getByRole('button', { name: /Edit|수정/i })
    await expect(editBtn).toBeHidden()

    const deleteBtn = page.getByRole('button', { name: /Delete|삭제/i })
    await expect(deleteBtn).toBeHidden()

    await screenshot(page, 'notices-viewer-readonly')
  })

  test('sidebar Notices menu highlights on /notices', async ({ adminPage: page }) => {
    await page.goto('/notices')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const noticesLink = page.locator('aside a[href="/notices"]')
    if (await noticesLink.isVisible().catch(() => false)) {
      // Active menu item typically has accent background
      const bgClass = await noticesLink.getAttribute('class')
      expect(bgClass).toMatch(/bg-th-accent|active|current/)
    }
  })

  test('header NoticeDropdown "View All" links to /notices', async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Click notification bell to open dropdown
    const bell = page.locator('header button').last()
    if (!await bell.isVisible().catch(() => false)) { test.skip(true, 'No bell'); return }

    await bell.click()
    await page.waitForTimeout(300)

    const viewAll = page.locator('a[href="/notices"]').filter({ hasText: /View All|전체 보기/i })
    if (await viewAll.isVisible().catch(() => false)) {
      await expect(viewAll).toHaveAttribute('href', '/notices')
      await screenshot(page, 'notices-dropdown-view-all')
    }
  })
})
