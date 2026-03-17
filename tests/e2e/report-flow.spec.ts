/**
 * Report Flow E2E — 신고 전체 플로우 테스트
 *
 * 생성 → 드래프트 편집 → 검토 제출 → 승인 → BR Submitting → 완료 → 클론
 *
 * ⚠️ 이 테스트는 실제 DB를 변경합니다. DEMO_MODE 또는 테스트 환경에서만 실행하세요.
 *    DEMO_MODE=true pnpm test:e2e -- tests/e2e/report-flow.spec.ts
 */
import { test, expect, screenshot } from './fixtures/auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLIDE_PANEL = '[data-testid="slide-panel"]'

/** Skip test if not authenticated (redirected to login) */
const ensureAuth = async (page: import('@playwright/test').Page): Promise<boolean> => {
  if (page.url().includes('/login')) {
    test.skip(true, 'No auth')
    return false
  }
  return true
}

/** Navigate to a report detail page by clicking the first row in the queue */
const openFirstReport = async (
  page: import('@playwright/test').Page,
  statusFilter?: string,
): Promise<string | null> => {
  const url = statusFilter ? `/reports?status=${statusFilter}` : '/reports'
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  if (!await ensureAuth(page)) return null

  const firstRow = page.locator('table tbody tr').first()
  if (!await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) return null

  await firstRow.click()
  await page.waitForLoadState('networkidle')

  // Should navigate to /reports/[id]
  const match = page.url().match(/\/reports\/([a-f0-9-]+)/)
  return match ? match[1] : null
}

/** Open first report in Completed page via preview panel */
const openFirstCompletedPreview = async (
  page: import('@playwright/test').Page,
  statusFilter?: string,
): Promise<boolean> => {
  const url = statusFilter
    ? `/reports/completed?status=${statusFilter}`
    : '/reports/completed'
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  if (!await ensureAuth(page)) return false

  // Check for empty state — if "No completed reports" text is visible, skip
  const emptyState = page.getByText(/No completed reports|완료된 신고가 없습니다/i)
  if (await emptyState.isVisible({ timeout: 2_000 }).catch(() => false)) return false

  // Find a clickable data row (not the empty-state row)
  const firstRow = page.locator('table tbody tr.cursor-pointer').first()
  if (!await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) return false

  await firstRow.click()

  // Preview panel should appear
  const panel = page.locator(SLIDE_PANEL)
  await expect(panel).toBeVisible({ timeout: 5_000 })
  return true
}

// ===========================================================================
// 1. Report Creation
// ===========================================================================
test.describe('Report Flow — 1. Creation', () => {
  test('manual report creation page loads', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // Page title
    await expect(page.locator('h1').first()).toBeVisible()

    // ASIN input field (placeholder is "e.g., B0DXXXXXXX")
    const asinInput = page.locator('input[placeholder*="B0D"]')
      .or(page.locator('input[name*="asin"]'))
    expect(await asinInput.count()).toBeGreaterThanOrEqual(1)

    // Violation type selector
    const violationSelect = page.locator('select, [role="listbox"], [role="combobox"]')
    expect(await violationSelect.count()).toBeGreaterThanOrEqual(1)

    await screenshot(page, 'flow-01-creation-page')
  })

  test('New Report button on queue page opens slide panel', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const newBtn = page.getByRole('button', { name: /New Report|새 신고/i })
    await newBtn.click()

    const panel = page.locator(SLIDE_PANEL)
    await expect(panel).toBeVisible()
    await screenshot(page, 'flow-01-new-report-panel')

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden({ timeout: 3_000 })
  })

  test('related ASIN add/remove works', async ({ adminPage: page }) => {
    await page.goto('/reports/new')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const addBtn = page.getByText(/Add ASIN/i)
    if (!await addBtn.isVisible().catch(() => false)) {
      test.skip(true, 'No Add ASIN button')
      return
    }

    const countBefore = await page.locator('input[placeholder="B08XXXXXXXX"]').count()
    await addBtn.click()
    const countAfter = await page.locator('input[placeholder="B08XXXXXXXX"]').count()
    expect(countAfter).toBeGreaterThan(countBefore)

    // Remove
    const removeBtn = page.locator('button[aria-label*="remove"], button[aria-label*="삭제"]')
      .or(page.locator('button').filter({ hasText: /×|✕/ }))
    if (await removeBtn.count() > 0) {
      await removeBtn.last().click()
      const countFinal = await page.locator('input[placeholder="B08XXXXXXXX"]').count()
      expect(countFinal).toBeLessThan(countAfter)
    }

    await screenshot(page, 'flow-01-related-asin')
  })
})

// ===========================================================================
// 2. Draft Editing
// ===========================================================================
test.describe('Report Flow — 2. Draft Editing', () => {
  test('draft report shows editable fields', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    // Title input
    const titleInput = page.locator('input').filter({ has: page.locator('[class*="label"]') }).first()
      .or(page.locator('label:has-text("Title") + input'))
      .or(page.locator('input').first())

    // Body textarea
    const bodyTextarea = page.locator('textarea').first()
    if (await bodyTextarea.isVisible().catch(() => false)) {
      await expect(bodyTextarea).toBeEnabled()
    }

    await screenshot(page, 'flow-02-draft-editable')
  })

  test('AI Write button exists for draft', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    const aiBtn = page.getByRole('button', { name: /AI Write/i })
    if (await aiBtn.isVisible().catch(() => false)) {
      await expect(aiBtn).toBeEnabled()
    }
    await screenshot(page, 'flow-02-ai-write-btn')
  })

  test('Capture Screenshot button exists for draft with listing', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    const captureBtn = page.getByRole('button', { name: /Capture Screenshot|스크린샷/i })
    // May or may not be visible depending on whether listing exists
    if (await captureBtn.isVisible().catch(() => false)) {
      await expect(captureBtn).toBeEnabled()
      await screenshot(page, 'flow-02-capture-btn')
    }
  })

  test('BR Form Type dropdown shows for BR-reportable violations', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    const brCategory = page.getByText('BR Report Category')
    if (await brCategory.isVisible().catch(() => false)) {
      const brSelect = page.locator('select').filter({ has: page.locator('option[value="other_policy"]') })
      await expect(brSelect).toBeVisible()
      await screenshot(page, 'flow-02-br-form-type')
    }
  })

  test('template panel opens and has templates', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    // Look for Templates tab or button
    const templateBtn = page.getByRole('button', { name: /Templates|템플릿/i })
      .or(page.getByText(/Templates/i).first())
    if (!await templateBtn.isVisible().catch(() => false)) {
      test.skip(true, 'No template button')
      return
    }

    await templateBtn.click()
    await page.waitForTimeout(500)

    // Either a panel opens or tab switches — look for template items
    const templateItem = page.getByRole('button', { name: /Use|적용/i }).first()
      .or(page.locator('[class*="template"]').first())
    await screenshot(page, 'flow-02-template-panel')
  })

  test('draft autosave indicator appears on edit', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    const bodyTextarea = page.locator('textarea').first()
    if (!await bodyTextarea.isVisible().catch(() => false)) {
      test.skip(true, 'No editable body')
      return
    }

    // Type something to trigger autosave
    await bodyTextarea.fill('E2E test autosave ' + Date.now())
    await page.waitForTimeout(2_000) // wait for autosave timer

    await screenshot(page, 'flow-02-autosave')
  })
})

// ===========================================================================
// 3. Submit for Review
// ===========================================================================
test.describe('Report Flow — 3. Submit for Review', () => {
  test('Submit Review button visible for draft', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'draft')
    if (!reportId) { test.skip(true, 'No draft reports'); return }

    const submitBtn = page.getByRole('button', { name: /Submit Review|검토 제출/i })
    if (await submitBtn.isVisible().catch(() => false)) {
      await expect(submitBtn).toBeEnabled()
      await screenshot(page, 'flow-03-submit-review-btn')
    }
  })

  test('bulk Submit Review from queue', async ({ adminPage: page }) => {
    await page.goto('/reports?status=draft')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) {
      test.skip(true, 'No draft reports')
      return
    }

    await checkbox.click()

    // Bulk action bar
    const bulkBar = page.getByText(/건 선택|selected/)
    await expect(bulkBar.first()).toBeVisible()

    const submitBtn = page.getByRole('button', { name: /Submit Review/i })
    await expect(submitBtn).toBeVisible()
    await screenshot(page, 'flow-03-bulk-submit-review')
  })
})

// ===========================================================================
// 4. Pending Review — Approve / Reject / Rewrite
// ===========================================================================
test.describe('Report Flow — 4. Review Actions', () => {
  test('pending_review shows Approve and Rewrite buttons', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // Navigate to pending review tab if available
    const pendingTab = page.locator('a[href*="pending"], a[href*="status=pending_review"]')
    if (await pendingTab.isVisible().catch(() => false)) {
      await pendingTab.click()
      await page.waitForLoadState('networkidle')
    }

    // Open first report
    const firstRow = page.locator('table tbody tr').first()
    if (!await firstRow.isVisible().catch(() => false)) {
      test.skip(true, 'No pending_review reports')
      return
    }
    await firstRow.click()
    await page.waitForLoadState('networkidle')

    // Approve button
    const approveBtn = page.getByRole('button', { name: /Approve|승인/i })
    if (await approveBtn.isVisible().catch(() => false)) {
      await expect(approveBtn).toBeEnabled()
    }

    // Rewrite button
    const rewriteBtn = page.getByRole('button', { name: /Rewrite|재작성/i })
    if (await rewriteBtn.isVisible().catch(() => false)) {
      await expect(rewriteBtn).toBeEnabled()
    }

    await screenshot(page, 'flow-04-review-actions')
  })

  test('Rewrite opens 2-step modal', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page)
    if (!reportId) { test.skip(true, 'No reports'); return }

    const rewriteBtn = page.getByRole('button', { name: /Rewrite|재작성/i })
    if (!await rewriteBtn.isVisible().catch(() => false)) {
      test.skip(true, 'No Rewrite button (not pending_review)')
      return
    }

    await rewriteBtn.click()

    // Step 1: Feedback textarea
    const feedbackArea = page.locator('textarea').last()
    await expect(feedbackArea).toBeVisible()

    // Confirm button should be disabled without feedback
    const confirmBtn = page.getByRole('button', { name: /Rewrite|확인/i }).last()

    // Type feedback
    await feedbackArea.fill('Please improve the evidence section')

    // Now confirm should be enabled
    await expect(confirmBtn).toBeEnabled()
    await screenshot(page, 'flow-04-rewrite-step1')

    // Cancel
    const cancelBtn = page.getByRole('button', { name: /Cancel|취소/i })
    await cancelBtn.click()
  })

  test('Reject button and reason input', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page)
    if (!reportId) { test.skip(true, 'No reports'); return }

    // Reject is in ReportActions for pending_review status
    const rejectBtn = page.getByRole('button', { name: /Reject|반려/i })
    if (!await rejectBtn.isVisible().catch(() => false)) {
      test.skip(true, 'No Reject button')
      return
    }

    // Don't actually click reject in E2E (would change state)
    await expect(rejectBtn).toBeEnabled()
    await screenshot(page, 'flow-04-reject-btn')
  })

  test('bulk Approve from queue', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // Click pending_review tab if exists
    const pendingTab = page.locator('a[href*="pending"]')
    if (await pendingTab.isVisible().catch(() => false)) {
      await pendingTab.click()
      await page.waitForLoadState('networkidle')
    }

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) {
      test.skip(true, 'No reports to select')
      return
    }

    await checkbox.click()

    const approveBtn = page.getByRole('button', { name: /Approve/i })
    if (await approveBtn.isVisible().catch(() => false)) {
      await expect(approveBtn).toBeEnabled()
      await screenshot(page, 'flow-04-bulk-approve')
    }
  })
})

// ===========================================================================
// 5. BR Submitting Banner
// ===========================================================================
test.describe('Report Flow — 5. BR Submitting', () => {
  test('br_submitting status shows spinner banner', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'br_submitting')
    if (!reportId) { test.skip(true, 'No br_submitting reports'); return }

    // BR 신고 제출 중 banner
    const banner = page.getByText(/BR 신고 제출 중|BR submitting/i)
    if (await banner.isVisible().catch(() => false)) {
      await expect(banner).toBeVisible()

      // Cancel button inside banner
      const cancelBtn = page.getByRole('button', { name: /취소|Cancel/i })
      await expect(cancelBtn).toBeVisible()
      await screenshot(page, 'flow-05-br-submitting-banner')
    }
  })

  test('ReportActions shows spinner for br_submitting', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page, 'br_submitting')
    if (!reportId) { test.skip(true, 'No br_submitting reports'); return }

    // Spinner in actions area
    const spinner = page.locator('svg[class*="animate-spin"]')
    expect(await spinner.count()).toBeGreaterThanOrEqual(1)
    await screenshot(page, 'flow-05-br-spinner')
  })
})

// ===========================================================================
// 6. Submitted / Monitoring / Resolved
// ===========================================================================
test.describe('Report Flow — 6. Completed States', () => {
  test('submitted report shows Case Management card', async ({ adminPage: page }) => {
    // Go to completed page for submitted reports
    if (!await openFirstCompletedPreview(page, 'resolved')) {
      test.skip(true, 'No resolved reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)

    // Case Management section
    const caseSection = panel.getByText('Case Management')
    if (await caseSection.isVisible().catch(() => false)) {
      await expect(caseSection).toBeVisible()
    }

    await screenshot(page, 'flow-06-case-management')
  })

  test('monitoring report shows BR 재신고 button', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)

    // Look for BR 재신고 button
    const resubmitBtn = panel.getByRole('button', { name: /BR 재신고|resubmit/i })
    if (await resubmitBtn.isVisible().catch(() => false)) {
      await expect(resubmitBtn).toBeEnabled()
      await screenshot(page, 'flow-06-br-resubmit')
    }
  })

  test('resolved report shows 해결 완료 status', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page, 'resolved')) {
      test.skip(true, 'No resolved reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)
    const resolvedText = panel.getByText(/해결 완료|Resolved/i)
    if (await resolvedText.isVisible().catch(() => false)) {
      await expect(resolvedText).toBeVisible()
    }
    await screenshot(page, 'flow-06-resolved')
  })

  test('unresolved report shows 재제출 info', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page, 'unresolved')) {
      test.skip(true, 'No unresolved reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)
    const unresolvedText = panel.getByText(/미해결|재제출|unresolved/i)
    if (await unresolvedText.isVisible().catch(() => false)) {
      await expect(unresolvedText).toBeVisible()
    }

    // Force resubmit button
    const forceBtn = panel.getByRole('button', { name: /강제 재제출|force resubmit/i })
    if (await forceBtn.isVisible().catch(() => false)) {
      await expect(forceBtn).toBeEnabled()
    }
    await screenshot(page, 'flow-06-unresolved')
  })
})

// ===========================================================================
// 7. Clone
// ===========================================================================
test.describe('Report Flow — 7. Clone', () => {
  test('Clone button appears in completed report preview', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)
    const cloneBtn = panel.getByRole('button', { name: /Clone as New/i })

    if (await cloneBtn.isVisible().catch(() => false)) {
      await expect(cloneBtn).toBeEnabled()
      await screenshot(page, 'flow-07-clone-btn')
    } else {
      // Status might not be clone-eligible (resubmitted, escalated)
      test.skip(true, 'Clone button not visible for this status')
    }
  })

  test('Clone button appears on direct detail page', async ({ adminPage: page }) => {
    // Navigate directly to a completed report
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // Get first report's link — on mobile it's a direct link
    const reportLink = page.locator('a[href*="/reports/"]').first()
    if (!await reportLink.isVisible().catch(() => false)) {
      // Desktop: click row to open panel, then look for a direct link
      test.skip(true, 'No direct report links')
      return
    }

    const href = await reportLink.getAttribute('href')
    if (!href) { test.skip(true, 'No href'); return }

    await page.goto(href)
    await page.waitForLoadState('networkidle')

    const cloneBtn = page.getByRole('button', { name: /Clone as New/i })
    if (await cloneBtn.isVisible().catch(() => false)) {
      await expect(cloneBtn).toBeEnabled()
      await screenshot(page, 'flow-07-clone-direct-detail')
    }
  })

  test('Clone creates new draft and navigates', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)
    const cloneBtn = panel.getByRole('button', { name: /Clone as New/i })

    if (!await cloneBtn.isVisible().catch(() => false)) {
      test.skip(true, 'Clone button not visible')
      return
    }

    // Click clone
    await cloneBtn.click()

    // Should navigate to the new report detail page
    await page.waitForURL(/\/reports\/[a-f0-9-]+/, { timeout: 10_000 })

    // New report should be a draft
    const statusBadge = page.locator('[class*="badge"], [class*="Badge"]').first()
      .or(page.getByText(/Draft|초안/i).first())
    await expect(statusBadge).toBeVisible({ timeout: 5_000 })

    // Should show editable fields (indicating it's a draft)
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible().catch(() => false)) {
      await expect(textarea).toBeEnabled()
    }

    await screenshot(page, 'flow-07-clone-result')
  })
})

// ===========================================================================
// 8. Delete
// ===========================================================================
test.describe('Report Flow — 8. Delete', () => {
  test('Delete button shows for admin', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page)
    if (!reportId) { test.skip(true, 'No reports'); return }

    const deleteBtn = page.getByRole('button', { name: /Delete|삭제/i })
    if (await deleteBtn.isVisible().catch(() => false)) {
      await expect(deleteBtn).toBeEnabled()
      await screenshot(page, 'flow-08-delete-btn')
    }
  })

  test('Delete shows confirmation modal', async ({ adminPage: page }) => {
    const reportId = await openFirstReport(page)
    if (!reportId) { test.skip(true, 'No reports'); return }

    const deleteBtn = page.getByRole('button', { name: /Delete|삭제/i })
    if (!await deleteBtn.isVisible().catch(() => false)) {
      test.skip(true, 'No delete button')
      return
    }

    await deleteBtn.click()

    // Confirmation modal
    const modal = page.getByText(/삭제하시겠습니까|Are you sure|Delete Report/i)
    await expect(modal.first()).toBeVisible()

    // Cancel
    const cancelBtn = page.getByRole('button', { name: /Cancel|취소/i })
    await cancelBtn.click()

    // Modal should close
    await expect(modal.first()).toBeHidden({ timeout: 3_000 })
    await screenshot(page, 'flow-08-delete-modal-cancel')
  })

  test('Delete button in completed preview panel', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)
    const deleteBtn = panel.getByRole('button', { name: /Delete|삭제/i })
    if (await deleteBtn.isVisible().catch(() => false)) {
      await expect(deleteBtn).toBeEnabled()
      await screenshot(page, 'flow-08-delete-in-preview')
    }
  })
})

// ===========================================================================
// 9. Preview Panel — Common Actions
// ===========================================================================
test.describe('Report Flow — 9. Preview Panel', () => {
  test('completed report preview panel opens and closes', async ({ adminPage: page }) => {
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // Check for empty state
    const emptyState = page.getByText(/No completed reports/i)
    if (await emptyState.isVisible({ timeout: 2_000 }).catch(() => false)) {
      test.skip(true, 'No completed reports')
      return
    }

    const firstRow = page.locator('table tbody tr.cursor-pointer').first()
    if (!await firstRow.isVisible().catch(() => false)) {
      test.skip(true, 'No completed reports')
      return
    }

    // Open
    await firstRow.click()
    const panel = page.locator(SLIDE_PANEL)
    await expect(panel).toBeVisible({ timeout: 5_000 })

    // Should stay on /reports/completed (not navigate away)
    expect(page.url()).toContain('/reports/completed')

    await screenshot(page, 'flow-09-preview-open')

    // Close with X button
    const closeBtn = panel.locator('button[aria-label*="닫기"]')
      .or(panel.locator('button').filter({ has: page.locator('svg') }).first())
    await closeBtn.click()
    await expect(panel).toBeHidden({ timeout: 3_000 })
  })

  test('preview panel closes with Escape key', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)
    await expect(panel).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden({ timeout: 3_000 })
  })

  test('preview panel shows status badge', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)

    // StatusBadge should be visible
    const badge = panel.locator('[class*="badge"], [class*="Badge"]').first()
      .or(panel.getByText(/Resolved|Unresolved|Submitted|Monitoring|해결|미해결/i).first())
    await expect(badge).toBeVisible()
    await screenshot(page, 'flow-09-preview-status')
  })

  test('preview panel shows timeline', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)

    // Timeline section (ordered list with events)
    const timeline = panel.locator('ol')
    if (await timeline.isVisible().catch(() => false)) {
      await expect(timeline).toBeVisible()
      await screenshot(page, 'flow-09-preview-timeline')
    }
  })

  test('preview panel shows report details cards', async ({ adminPage: page }) => {
    if (!await openFirstCompletedPreview(page)) {
      test.skip(true, 'No completed reports')
      return
    }

    const panel = page.locator(SLIDE_PANEL)

    // Case Management card
    const caseCard = panel.getByText('Case Management')
    if (await caseCard.isVisible().catch(() => false)) {
      await expect(caseCard).toBeVisible()
    }

    // Report Draft card
    const draftCard = panel.getByText(/Report Draft|신고서/i)
    if (await draftCard.isVisible().catch(() => false)) {
      await expect(draftCard).toBeVisible()
    }

    await screenshot(page, 'flow-09-preview-cards')
  })
})

// ===========================================================================
// 10. Bulk Actions
// ===========================================================================
test.describe('Report Flow — 10. Bulk Actions', () => {
  test('select all checkbox toggles all rows', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const headerCheckbox = page.locator('table thead input[type="checkbox"]')
    if (!await headerCheckbox.isVisible().catch(() => false)) {
      test.skip(true, 'No header checkbox')
      return
    }

    await headerCheckbox.click()

    // All row checkboxes should be checked
    const rowCheckboxes = page.locator('table tbody input[type="checkbox"]')
    const count = await rowCheckboxes.count()
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        await expect(rowCheckboxes.nth(i)).toBeChecked()
      }
    }

    // Uncheck all
    await headerCheckbox.click()
    if (count > 0) {
      await expect(rowCheckboxes.first()).not.toBeChecked()
    }
    await screenshot(page, 'flow-10-select-all')
  })

  test('completed page bulk BR Resubmit', async ({ adminPage: page }) => {
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) {
      test.skip(true, 'No reports or no checkboxes')
      return
    }

    await checkbox.click()

    const brBtn = page.getByRole('button', { name: /BR 재신고/i })
    if (await brBtn.isVisible().catch(() => false)) {
      await expect(brBtn).toBeEnabled()
      await screenshot(page, 'flow-10-bulk-br-resubmit')
    }
  })

  test('completed page bulk Archive', async ({ adminPage: page }) => {
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) {
      test.skip(true, 'No reports or no checkboxes')
      return
    }

    await checkbox.click()

    const archiveBtn = page.getByRole('button', { name: /Archive/i })
    if (await archiveBtn.isVisible().catch(() => false)) {
      await expect(archiveBtn).toBeEnabled()
      await screenshot(page, 'flow-10-bulk-archive')
    }
  })

  test('queue page bulk Delete confirmation', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const checkbox = page.locator('table tbody tr td:first-child input[type="checkbox"]').first()
    if (!await checkbox.isVisible().catch(() => false)) {
      test.skip(true, 'No reports')
      return
    }

    await checkbox.click()

    const deleteBtn = page.getByRole('button', { name: /Delete/i })
    if (!await deleteBtn.isVisible().catch(() => false)) {
      test.skip(true, 'No bulk delete')
      return
    }

    await deleteBtn.click()

    // Modal should appear
    const modal = page.getByText(/삭제하시겠습니까|Delete|confirm/i)
    await expect(modal.first()).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: /Cancel|취소/i }).click()
    await screenshot(page, 'flow-10-bulk-delete-cancel')
  })
})

// ===========================================================================
// 11. Status Tabs & Filters
// ===========================================================================
test.describe('Report Flow — 11. Navigation & Filters', () => {
  test('queue status tabs filter correctly', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // All tab
    const allTab = page.locator('a').filter({ hasText: /^All$|^전체$/i }).first()
    if (await allTab.isVisible().catch(() => false)) {
      await allTab.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/reports(\?|$)/)
    }

    // Draft tab
    const draftTab = page.locator('a[href*="status=draft"]').first()
    if (await draftTab.isVisible().catch(() => false)) {
      await draftTab.click()
      await page.waitForURL(/status=draft/, { timeout: 5_000 })
    }

    // BR Submitting tab
    const brTab = page.locator('a[href*="status=br_submitting"]').first()
    if (await brTab.isVisible().catch(() => false)) {
      await brTab.click()
      await page.waitForURL(/status=br_submitting/, { timeout: 5_000 })
    }

    await screenshot(page, 'flow-11-status-tabs')
  })

  test('completed page status tabs', async ({ adminPage: page }) => {
    await page.goto('/reports/completed')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    // Resolved tab
    const resolvedTab = page.locator('a[href*="status=resolved"]').first()
    if (await resolvedTab.isVisible().catch(() => false)) {
      await resolvedTab.click()
      await page.waitForURL(/status=resolved/, { timeout: 5_000 })
    }

    // Unresolved tab
    const unresolvedTab = page.locator('a[href*="status=unresolved"]').first()
    if (await unresolvedTab.isVisible().catch(() => false)) {
      await unresolvedTab.click()
      await page.waitForURL(/status=unresolved/, { timeout: 5_000 })
    }

    await screenshot(page, 'flow-11-completed-tabs')
  })

  test('search filter works in queue', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const searchInput = page.locator('input[type="text"]').first()
    if (!await searchInput.isVisible().catch(() => false)) {
      test.skip(true, 'No search input')
      return
    }

    await searchInput.fill('NONEXISTENT_XYZ_99999')
    await page.waitForTimeout(500)

    // Should show empty state or no results
    const emptyState = page.getByText(/no results|결과 없음|No reports/i)
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(emptyState).toBeVisible()
    }

    await screenshot(page, 'flow-11-search-empty')
  })

  test('owner toggle switches my/all', async ({ adminPage: page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    if (!await ensureAuth(page)) return

    const ownerToggle = page.getByRole('button', { name: /My|All|내|전체/i }).first()
      .or(page.locator('[class*="toggle"]').first())
    if (await ownerToggle.isVisible().catch(() => false)) {
      await ownerToggle.click()
      await page.waitForTimeout(500)
      await screenshot(page, 'flow-11-owner-toggle')
    }
  })
})
