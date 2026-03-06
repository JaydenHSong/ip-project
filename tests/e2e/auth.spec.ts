import { test, expect, screenshot, IS_DEMO } from './fixtures/auth'

test.describe('1. Auth & RBAC', () => {
  test('login page shows Google OAuth button', async ({ page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode auto-redirects from /login'); return }
    await page.goto('/login')
    const btn = page.getByRole('button', { name: /sign in with google|google로 로그인/i })
    await expect(btn).toBeVisible()
    await screenshot(page, 'auth-login-page')
  })

  test('unauthenticated user redirected to /login from /dashboard', async ({ page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode auto-authenticates'); return }
    // Clear all cookies to simulate unauthenticated state
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user redirected to /login from /reports', async ({ page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode auto-authenticates'); return }
    await page.context().clearCookies()
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Admin: all sidebar menus visible', async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside')
    if (!await sidebar.isVisible().catch(() => false)) {
      test.skip(true, 'No auth session — skipping')
      return
    }

    await expect(sidebar.locator('a[href="/dashboard"]')).toBeVisible()
    await expect(sidebar.locator('a[href="/campaigns"]')).toBeVisible()
    await expect(sidebar.locator('a[href="/reports"]')).toBeVisible()
    await expect(sidebar.locator('a[href="/reports/completed"]')).toBeVisible()
    await expect(sidebar.locator('a[href="/patents"]')).toBeVisible()
    await expect(sidebar.locator('a[href="/notices"]')).toBeVisible()
    await expect(sidebar.locator('a[href="/settings"]')).toBeVisible()
    await screenshot(page, 'auth-admin-sidebar')
  })

  test('Admin: can access /settings', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }
    await expect(page.getByText(/Settings|설정/i).first()).toBeVisible()
  })

  test('Editor: settings access limited', async ({ editorPage: page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode has no role differentiation'); return }
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Editor should not see Users tab
    const usersTab = page.getByRole('button', { name: /Users|사용자/i })
    await expect(usersTab).toBeHidden()
  })

  test('Viewer: no create/edit/delete buttons on /reports', async ({ viewerPage: page }) => {
    if (IS_DEMO) { test.skip(true, 'Demo mode has no role differentiation'); return }
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Viewer should not see "New Report" button
    const newBtn = page.getByRole('button', { name: /New Report|새 신고/i })
    await expect(newBtn).toBeHidden()
    await screenshot(page, 'auth-viewer-reports')
  })
})
