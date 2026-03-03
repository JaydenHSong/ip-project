import { test, expect } from '@playwright/test'

test.describe('Report Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports/rpt-001')
  })

  test('renders report detail page', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText(/Report Detail|신고 상세/)
  })

  test('shows status badge (pending_review)', async ({ page }) => {
    // rpt-001 is pending_review
    await expect(page.locator('text=Pending').or(page.locator('text=검토 대기')).first()).toBeVisible()
  })

  test('shows violation info card', async ({ page }) => {
    await expect(page.locator('h2', { hasText: /Violation|위반/ }).first()).toBeVisible()
  })

  test('shows listing info card with ASIN', async ({ page }) => {
    await expect(page.getByText('B0D1234567').first()).toBeVisible()
  })

  test('shows listing title', async ({ page }) => {
    await expect(page.getByText('Premium iPhone 16 Pro Max Case', { exact: false }).first()).toBeVisible()
  })

  test('shows seller name', async ({ page }) => {
    await expect(page.getByText('TechCase Store').first()).toBeVisible()
  })

  test('shows editable draft fields for pending_review', async ({ page }) => {
    // rpt-001 is pending_review, demo user is admin → editable
    const titleInput = page.locator('input')
    const bodyTextarea = page.locator('textarea')
    // At least one input and textarea should exist for the draft
    const inputCount = await titleInput.count()
    const textareaCount = await bodyTextarea.count()
    expect(inputCount + textareaCount).toBeGreaterThanOrEqual(2)
  })

  test('shows timeline section', async ({ page }) => {
    await expect(page.locator('h2', { hasText: /Timeline|타임라인/ }).first()).toBeVisible()
  })

  test('back button navigates to /reports', async ({ page }) => {
    const backLink = page.locator('a[href="/reports"] svg').first()
    await backLink.click()
    await expect(page).toHaveURL(/\/reports$/)
  })

  test('report actions are present', async ({ page }) => {
    // ReportActions component should render some buttons
    const actionArea = page.locator('.ml-auto')
    await expect(actionArea).toBeVisible()
  })
})
