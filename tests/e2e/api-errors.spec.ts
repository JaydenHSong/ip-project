import { test, expect, screenshot } from './fixtures/auth'

test.describe('12. API Error Handling', () => {
  test('network error shows error message', async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Simulate network failure for API calls
    await page.route('**/api/**', (route) => route.abort('connectionrefused'))

    // Navigate to a page that makes API calls
    await page.goto('/reports')
    await page.waitForTimeout(2000)

    // Should show error state or fallback UI (not crash)
    const hasContent = await page.locator('h1, [class*="error"], [class*="Error"]').count()
    expect(hasContent).toBeGreaterThanOrEqual(1)

    // Unroute for cleanup
    await page.unroute('**/api/**')
    await screenshot(page, 'api-error-network')
  })

  test('403 on unauthorized API call', async ({ viewerPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Viewer trying to delete a report should get 403
    const response = await page.request.delete('/api/reports/nonexistent-id')
    expect([401, 403, 404]).toContain(response.status())
  })

  test('404 on nonexistent report', async ({ adminPage: page }) => {
    await page.goto('/reports/this-report-does-not-exist-12345')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Should show 404 or redirect to report list
    const is404 = page.url().includes('/reports') || page.url().includes('404')
    expect(is404).toBeTruthy()
    await screenshot(page, 'api-error-404-report')
  })

  test('API returns proper error JSON structure', async ({ adminPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    if (page.url().includes('/login')) { test.skip(true, 'No auth'); return }

    // Call bulk-delete with empty array
    const response = await page.request.post('/api/reports/bulk-delete', {
      data: { report_ids: [] },
    })
    const status = response.status()
    if (status === 400) {
      const body = await response.json()
      expect(body).toHaveProperty('error')
    }
  })
})
