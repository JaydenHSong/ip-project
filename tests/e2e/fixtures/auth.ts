import { test as base, expect, type Page } from '@playwright/test'
import path from 'node:path'

// ---------------------------------------------------------------------------
// Role-based storage state paths
// ---------------------------------------------------------------------------
const STORAGE_DIR = path.join(__dirname, '..', '..', '..', 'test-results', 'auth')

export const STORAGE_STATE = {
  admin: path.join(STORAGE_DIR, 'admin.json'),
  editor: path.join(STORAGE_DIR, 'editor.json'),
  viewer: path.join(STORAGE_DIR, 'viewer.json'),
} as const

export type TestRole = keyof typeof STORAGE_STATE

// ---------------------------------------------------------------------------
// Vercel Deployment Protection bypass headers (for preview deployments)
// ---------------------------------------------------------------------------
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const extraHTTPHeaders = bypassSecret
  ? { 'x-vercel-protection-bypass': bypassSecret }
  : undefined

// ---------------------------------------------------------------------------
// Extended test fixture with role-aware page
// ---------------------------------------------------------------------------
type AuthFixtures = {
  adminPage: Page
  editorPage: Page
  viewerPage: Page
}

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.admin, extraHTTPHeaders })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
  editorPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.editor, extraHTTPHeaders })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
  viewerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE.viewer, extraHTTPHeaders })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
})

export { expect }

// ---------------------------------------------------------------------------
// Demo mode detection — all roles are the same user in demo mode
// ---------------------------------------------------------------------------
export const IS_DEMO = process.env.DEMO_MODE === 'true'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the app shell to be ready (sidebar visible) */
export const waitForAppShell = async (page: Page): Promise<void> => {
  await page.waitForLoadState('networkidle')
  // On desktop the sidebar should render
  const sidebar = page.locator('aside')
  if (await sidebar.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await expect(sidebar).toBeVisible()
  }
}

/** Take a named screenshot and save to test-results */
export const screenshot = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({
    path: path.join(__dirname, '..', '..', '..', 'test-results', 'screenshots', `${name}.png`),
    fullPage: true,
  })
}
