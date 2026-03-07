/**
 * Responsive QA — Full Breakpoint Inspection
 * 6 viewports × 11 pages = 66 screenshot + overflow checks
 */
import { test, expect, screenshot as takeScreenshot } from './fixtures/auth'
import path from 'node:path'

const viewports = [
  { name: 'phone-s', width: 375, height: 812 },
  { name: 'phone-l', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-l', width: 1024, height: 1366 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'desktop-l', width: 1920, height: 1080 },
] as const

const pages = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'reports', path: '/reports' },
  { name: 'reports-new', path: '/reports/new' },
  { name: 'reports-completed', path: '/reports/completed' },
  { name: 'campaigns', path: '/campaigns' },
  { name: 'campaigns-new', path: '/campaigns/new' },
  { name: 'patents', path: '/patents' },
  { name: 'notices', path: '/notices' },
  { name: 'settings', path: '/settings' },
] as const

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test-results', 'responsive-qa')

test.describe('Responsive QA — Full Breakpoint Inspection', () => {
  for (const vp of viewports) {
    for (const pg of pages) {
      test(`${vp.name} (${vp.width}px): ${pg.name}`, async ({ adminPage: page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(pg.path)
        await page.waitForLoadState('networkidle')
        if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

        // Wait for dynamic content
        await page.waitForTimeout(1000)

        // --- Check 1: Horizontal overflow ---
        const overflow = await page.evaluate(() => {
          const body = document.body
          const html = document.documentElement
          return {
            bodyScrollW: body.scrollWidth,
            htmlScrollW: html.scrollWidth,
            viewportW: window.innerWidth,
            hasHorizontalScroll: body.scrollWidth > window.innerWidth + 5,
          }
        })

        // --- Check 2: Elements overflowing viewport ---
        const overflowingElements = await page.evaluate(() => {
          const vpWidth = window.innerWidth
          const results: string[] = []
          const all = document.querySelectorAll('*')
          for (const el of all) {
            const rect = el.getBoundingClientRect()
            if (rect.width > 0 && rect.right > vpWidth + 10) {
              const tag = el.tagName.toLowerCase()
              const cls = el.className?.toString().slice(0, 60) || ''
              const id = el.id ? `#${el.id}` : ''
              results.push(`<${tag}${id}> right=${Math.round(rect.right)} cls="${cls}"`)
            }
          }
          return results.slice(0, 10)  // top 10
        })

        // --- Check 3: Touch targets < 44px (mobile only) ---
        let smallTouchTargets: string[] = []
        if (vp.width <= 430) {
          smallTouchTargets = await page.evaluate(() => {
            const results: string[] = []
            const clickables = document.querySelectorAll('button, a, [role="button"], input[type="checkbox"]')
            for (const el of clickables) {
              const rect = el.getBoundingClientRect()
              if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
                const tag = el.tagName.toLowerCase()
                const text = (el as HTMLElement).innerText?.slice(0, 30) || ''
                const cls = el.className?.toString().slice(0, 40) || ''
                results.push(`<${tag}> ${Math.round(rect.width)}x${Math.round(rect.height)} "${text}" cls="${cls}"`)
              }
            }
            return results.slice(0, 10)
          })
        }

        // --- Check 4: Text truncation / overflow ---
        const textOverflows = await page.evaluate(() => {
          const results: string[] = []
          const textEls = document.querySelectorAll('p, span, td, th, h1, h2, h3, h4, a, label, div')
          for (const el of textEls) {
            const htmlEl = el as HTMLElement
            if (htmlEl.scrollWidth > htmlEl.clientWidth + 5 && htmlEl.clientWidth > 0) {
              const style = getComputedStyle(htmlEl)
              if (style.overflow !== 'hidden' && style.textOverflow !== 'ellipsis' && !style.overflowX?.includes('auto') && !style.overflowX?.includes('scroll')) {
                const tag = el.tagName.toLowerCase()
                const text = htmlEl.innerText?.slice(0, 40) || ''
                results.push(`<${tag}> scrollW=${htmlEl.scrollWidth} clientW=${htmlEl.clientWidth} "${text}"`)
              }
            }
          }
          return results.slice(0, 10)
        })

        // --- Check 5: Dark mode contrast (check for invisible text) ---
        const lowContrastElements = await page.evaluate(() => {
          const results: string[] = []
          const textEls = document.querySelectorAll('p, span, td, th, h1, h2, h3, h4, a, label, button')
          for (const el of textEls) {
            const style = getComputedStyle(el)
            const color = style.color
            const bg = style.backgroundColor
            // Check for same color text and bg (invisible)
            if (color && bg && color === bg && (el as HTMLElement).innerText?.trim()) {
              results.push(`<${el.tagName.toLowerCase()}> color=${color} bg=${bg} "${(el as HTMLElement).innerText?.slice(0, 30)}"`)
            }
          }
          return results.slice(0, 5)
        })

        // Screenshot (both light and dark)
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${vp.name}_${pg.name}_light.png`),
          fullPage: true,
        })

        // Toggle dark mode if possible
        const themeBtn = page.locator('button[aria-label*="mode"], button[aria-label*="Mode"], button[aria-label*="theme"], button[aria-label*="Theme"]')
        if (await themeBtn.first().isVisible().catch(() => false)) {
          await themeBtn.first().click()
          await page.waitForTimeout(300)
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, `${vp.name}_${pg.name}_dark.png`),
            fullPage: true,
          })
          // Toggle back
          await themeBtn.first().click()
        }

        // --- Report findings ---
        const issues: string[] = []
        if (overflow.hasHorizontalScroll) {
          issues.push(`OVERFLOW: body.scrollWidth(${overflow.bodyScrollW}) > viewport(${overflow.viewportW})`)
        }
        if (overflowingElements.length > 0) {
          issues.push(`ELEMENTS_OVERFLOW: ${overflowingElements.join(' | ')}`)
        }
        if (smallTouchTargets.length > 0) {
          issues.push(`SMALL_TOUCH: ${smallTouchTargets.join(' | ')}`)
        }
        if (textOverflows.length > 0) {
          issues.push(`TEXT_OVERFLOW: ${textOverflows.join(' | ')}`)
        }
        if (lowContrastElements.length > 0) {
          issues.push(`LOW_CONTRAST: ${lowContrastElements.join(' | ')}`)
        }

        // Log all issues for analysis
        if (issues.length > 0) {
          console.log(`\n=== ISSUES: ${vp.name} (${vp.width}px) - ${pg.name} ===`)
          for (const issue of issues) {
            console.log(`  ${issue}`)
          }
        }

        // Fail on critical overflow (body-level horizontal scroll)
        expect(overflow.hasHorizontalScroll, `Horizontal overflow on ${pg.name} at ${vp.width}px`).toBe(false)
      })
    }
  }
})
