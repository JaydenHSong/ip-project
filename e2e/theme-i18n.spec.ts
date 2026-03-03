import { test, expect } from '@playwright/test'

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure consistent initial state
    await page.goto('/dashboard')
    await page.evaluate(() => localStorage.removeItem('sentinel-theme'))
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('default theme is dark', async ({ page }) => {
    const dataTheme = await page.locator('html').getAttribute('data-theme')
    expect(dataTheme).toBe('dark')
  })

  test('toggle to light mode', async ({ page }) => {
    // In dark mode, the button label says "Switch to light mode"
    const themeBtn = page.locator('header button[aria-label]').filter({ hasText: '' }).locator('visible=true').last()
    // More reliable: find by the Sun/Moon icon - theme button is one with aria-label containing "mode"
    const btn = page.locator('header').locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await btn.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('toggle back to dark mode', async ({ page }) => {
    // Toggle to light first
    const btn = page.locator('header').locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await btn.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    // Toggle back to dark (aria-label changes after toggle)
    const darkBtn = page.locator('header').locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await darkBtn.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('theme persists CSS variable change', async ({ page }) => {
    // Read a CSS variable in dark mode (raw vars, not Tailwind mapped ones)
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim()
    )

    // Toggle to light
    const btn = page.locator('header').locator('button[aria-label*="mode"], button[aria-label*="Mode"]')
    await btn.click()
    await page.waitForTimeout(200)

    const lightBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim()
    )

    // Both should have values, and they should differ
    expect(darkBg).toBeTruthy()
    expect(lightBg).toBeTruthy()
    expect(darkBg).not.toBe(lightBg)
  })
})

test.describe('Language Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage for consistent initial state
    await page.goto('/dashboard')
    await page.evaluate(() => localStorage.removeItem('sentinel-locale'))
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('language toggle shows EN or KO', async ({ page }) => {
    const langBtn = page.locator('header button[aria-label="Toggle language"]')
    await expect(langBtn).toBeVisible()
    const text = await langBtn.textContent()
    expect(text).toMatch(/EN|KO/)
  })

  test('toggle language changes UI labels', async ({ page }) => {
    const langBtn = page.locator('header button[aria-label="Toggle language"]')
    const initialText = await langBtn.textContent()

    await langBtn.click()
    await page.waitForTimeout(300)

    const newText = await langBtn.textContent()
    expect(newText).not.toBe(initialText)
  })

  test('KO mode shows Korean labels', async ({ page }) => {
    const langBtn = page.locator('header button[aria-label="Toggle language"]')
    const currentText = await langBtn.textContent()

    // If currently EN, click to switch to KO
    if (currentText?.includes('EN')) {
      await langBtn.click()
      await page.waitForTimeout(300)
    }

    // In KO mode, sidebar should show Korean text
    const sidebar = page.locator('aside')
    await expect(sidebar.getByText('대시보드')).toBeVisible()
  })

  test('EN mode shows English labels', async ({ page }) => {
    const langBtn = page.locator('header button[aria-label="Toggle language"]')
    const currentText = await langBtn.textContent()

    // If currently KO, click to switch to EN
    if (currentText?.includes('KO')) {
      await langBtn.click()
      await page.waitForTimeout(300)
    }

    // In EN mode, sidebar should show English text
    const sidebar = page.locator('aside')
    await expect(sidebar.getByText('Dashboard')).toBeVisible()
  })
})
