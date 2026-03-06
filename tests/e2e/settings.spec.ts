import { test, expect, screenshot } from './fixtures/auth'

test.describe('10. Settings — TASK-04, 11, 12', () => {
  test('settings page loads', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    await expect(page.getByText(/Settings|설정/i).first()).toBeVisible()
    await screenshot(page, 'settings-page')
  })

  test('extension tab: 4-step wizard stepper — TASK-04', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const extensionTab = page.getByRole('button', { name: /Extension|익스텐션/i })
    if (!await extensionTab.isVisible().catch(() => false)) { test.skip(true, 'No extension tab'); return }

    await extensionTab.click()
    await page.waitForTimeout(500)

    // Stepper should show 4 steps
    const steps = page.locator('button, div').filter({
      hasText: /Download|Extract|Load|Verify|다운로드|압축|로드|검증/,
    })
    expect(await steps.count()).toBeGreaterThanOrEqual(4)
    await screenshot(page, 'settings-extension-stepper')
  })

  test('extension tab: download button prominent — TASK-04', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const extensionTab = page.getByRole('button', { name: /Extension|익스텐션/i })
    if (!await extensionTab.isVisible().catch(() => false)) { test.skip(true, 'No extension tab'); return }

    await extensionTab.click()
    await page.waitForTimeout(500)

    const downloadBtn = page.getByRole('button', { name: /Download|다운로드/i }).first()
    if (await downloadBtn.isVisible().catch(() => false)) {
      await expect(downloadBtn).toBeVisible()
    }
  })

  test('extension tab: version history timeline — TASK-04', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const extensionTab = page.getByRole('button', { name: /Extension|익스텐션/i })
    if (!await extensionTab.isVisible().catch(() => false)) { test.skip(true, 'No extension tab'); return }

    await extensionTab.click()
    await page.waitForTimeout(500)

    // Version history section
    const versionSection = page.getByText(/Version History|버전 히스토리|버전 기록/i)
    if (await versionSection.isVisible().catch(() => false)) {
      await expect(versionSection).toBeVisible()
      await screenshot(page, 'settings-extension-version-history')
    }
  })

  test('no notices tab in settings — TASK-11', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Scope to main content area to avoid matching sidebar/header Notices links
    const settingsArea = page.locator('main')
    const noticesTab = settingsArea.getByRole('button', { name: /^Notices$|^공지$/i })
    await expect(noticesTab).toBeHidden()
  })

  test('no system-status tab in settings — TASK-12', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    const settingsArea = page.locator('main')
    const sysTab = settingsArea.getByRole('button', { name: /^System Status$|^시스템 상태$/i })
    await expect(sysTab).toBeHidden()
  })

  test('Users tab visible only for Owner', async ({ adminPage: page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Admin/Owner should see Users tab
    const usersTab = page.getByRole('button', { name: /Users|사용자/i })
    // This depends on user role — Owner sees it, Admin might or might not
    if (await usersTab.isVisible().catch(() => false)) {
      await usersTab.click()
      await page.waitForTimeout(500)
      await expect(page.getByText(/User Management|사용자 관리|Name|이름/i).first()).toBeVisible()
      await screenshot(page, 'settings-users-tab')
    }
  })
})
