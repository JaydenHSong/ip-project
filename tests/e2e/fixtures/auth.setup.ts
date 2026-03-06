/**
 * Auth setup — injects session cookies for each role.
 *
 * Google OAuth cannot be automated in E2E, so we inject Supabase session
 * cookies captured from real browser sessions.
 *
 * HOW TO USE:
 * 1. Log in manually in the browser for each role (admin, editor, viewer)
 * 2. Copy the Supabase auth cookies from DevTools → Application → Cookies
 * 3. Set env vars:
 *    - TEST_ADMIN_SESSION  = sb-<ref>-auth-token cookie value
 *    - TEST_EDITOR_SESSION = sb-<ref>-auth-token cookie value
 *    - TEST_VIEWER_SESSION = sb-<ref>-auth-token cookie value
 *
 * Or use DEMO_MODE=true to skip real auth (demo user auto-login).
 */
import { test as setup } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { STORAGE_STATE, type TestRole } from './auth'

const SUPABASE_REF = 'njbhqrrdnmiarjjpgqwd'
const COOKIE_NAME = `sb-${SUPABASE_REF}-auth-token`

const STORAGE_DIR = path.dirname(STORAGE_STATE.admin)

const SESSION_ENVS: Record<TestRole, string> = {
  admin: 'TEST_ADMIN_SESSION',
  editor: 'TEST_EDITOR_SESSION',
  viewer: 'TEST_VIEWER_SESSION',
}

for (const role of ['admin', 'editor', 'viewer'] as const) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    // Ensure output directory exists
    fs.mkdirSync(STORAGE_DIR, { recursive: true })

    const sessionToken = process.env[SESSION_ENVS[role]]
    const isDemoMode = process.env.DEMO_MODE === 'true'

    if (isDemoMode) {
      // In demo mode, just visit the app — demo middleware auto-authenticates
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
    } else if (sessionToken) {
      // Inject Supabase auth cookie
      const baseURL = page.context().pages()[0]?.url() || 'http://localhost:3000'
      const domain = new URL(baseURL).hostname

      await page.context().addCookies([
        {
          name: COOKIE_NAME,
          value: sessionToken,
          domain,
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ])

      // Verify the session works
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // If redirected to login, the session is invalid
      if (page.url().includes('/login')) {
        throw new Error(
          `Session cookie for ${role} is invalid or expired. ` +
          `Please update ${SESSION_ENVS[role]} env var.`
        )
      }
    } else {
      // No session provided — create a minimal storage state so tests can skip gracefully
      console.warn(
        `⚠️  No session for ${role} (set ${SESSION_ENVS[role]} or DEMO_MODE=true). ` +
        `Tests requiring this role will be skipped.`
      )
      await page.goto('/login')
    }

    await page.context().storageState({ path: STORAGE_STATE[role] })
  })
}
