// SC RAV 폼 자동 제출 워커 — Playwright
import { chromium, type Page } from 'playwright'
import type { Job } from 'bullmq'
import type { ScSubmitJobData, ScSubmitResult } from './types.js'
import { log } from '../logger.js'

const SC_LOGIN_TIMEOUT = 30_000
const SC_FORM_TIMEOUT = 15_000

const getOtpCode = async (): Promise<string> => {
  const secret = process.env['SC_OTP_SECRET']
  if (!secret) throw new Error('SC_OTP_SECRET not configured')

  // Dynamic import for OTP generation
  const { TOTP } = await import('otpauth')
  const totp = new TOTP({ secret, digits: 6, period: 30 })
  return totp.generate()
}

const loginToSc = async (page: Page): Promise<void> => {
  const email = process.env['SC_EMAIL']
  const password = process.env['SC_PASSWORD']

  if (!email || !password) {
    throw new Error('SC_EMAIL or SC_PASSWORD not configured')
  }

  // Check if already logged in
  const isLoggedIn = await page.locator('#sc-navbar').isVisible().catch(() => false)
  if (isLoggedIn) return

  // Login flow
  await page.fill('#ap_email', email, { timeout: SC_LOGIN_TIMEOUT })
  await page.click('#continue')
  await page.fill('#ap_password', password, { timeout: SC_LOGIN_TIMEOUT })
  await page.click('#signInSubmit')

  // OTP if required
  const otpInput = await page.waitForSelector('#auth-mfa-otpcode', { timeout: 5_000 }).catch(() => null)
  if (otpInput) {
    const otpCode = await getOtpCode()
    await otpInput.fill(otpCode)
    await page.click('#auth-signin-button')
  }

  // Wait for SC dashboard
  await page.waitForSelector('#sc-navbar', { timeout: SC_LOGIN_TIMEOUT })
  log('info', 'sc-worker', 'SC login successful')
}

const fillRavForm = async (page: Page, data: ScSubmitJobData): Promise<string | null> => {
  // Wait for RAV form to load
  await page.waitForSelector('[data-testid="rav-form"], form[name="reportAbuse"], #reportAbuse', {
    timeout: SC_FORM_TIMEOUT,
  })

  // Fill ASIN
  const asinInput = await page.$('input[name="asin"], #asin-input, [data-testid="asin-input"]')
  if (asinInput) {
    await asinInput.fill(data.asin)
  }

  // Select violation type
  const violationSelect = await page.$('select[name="violationType"], #violation-type-select')
  if (violationSelect) {
    await violationSelect.selectOption({ label: data.violationTypeSc })
  }

  // Fill description
  const descInput = await page.$('textarea[name="description"], #description-textarea, [data-testid="description"]')
  if (descInput) {
    await descInput.fill(data.description)
  }

  // Add evidence URLs
  for (const url of data.evidenceUrls.slice(0, 5)) {
    const addEvidenceBtn = await page.$('[data-testid="add-evidence"], .add-evidence-btn')
    if (addEvidenceBtn) {
      await addEvidenceBtn.click()
      const lastInput = await page.$('input[name="evidenceUrl"]:last-of-type, .evidence-url-input:last-of-type')
      if (lastInput) await lastInput.fill(url)
    }
  }

  // Submit
  const submitBtn = await page.$('button[type="submit"], #submit-report-btn, [data-testid="submit-btn"]')
  if (!submitBtn) throw new Error('Submit button not found')

  await submitBtn.click()

  // Wait for confirmation & capture case ID
  await page.waitForLoadState('networkidle', { timeout: SC_FORM_TIMEOUT })

  // Try to extract case ID from confirmation page
  const caseIdElement = await page.$('[data-testid="case-id"], .case-id, #caseId')
  if (caseIdElement) {
    return await caseIdElement.textContent()
  }

  // Try URL pattern
  const url = page.url()
  const caseMatch = url.match(/case[_-]?id[=\/](\d+)/i)
  if (caseMatch) return caseMatch[1]

  // Try page content
  const content = await page.content()
  const contentMatch = content.match(/case\s*(?:id|#|number)[:\s]*(\d{5,})/i)
  if (contentMatch) return contentMatch[1]

  return null
}

const processScSubmitJob = async (job: Job<ScSubmitJobData>): Promise<ScSubmitResult> => {
  const data = job.data
  log('info', 'sc-worker', `Processing SC submit for report ${data.reportId} (ASIN: ${data.asin})`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    })

    const page = await context.newPage()

    // Navigate to SC RAV URL
    await page.goto(data.scRavUrl, { waitUntil: 'networkidle', timeout: 30_000 })

    // Login if needed
    await loginToSc(page)

    // Fill and submit RAV form
    const caseId = await fillRavForm(page, data)

    await context.close()

    log('info', 'sc-worker', `SC submit successful for report ${data.reportId}, case ID: ${caseId}`)

    return {
      reportId: data.reportId,
      success: true,
      scCaseId: caseId,
      error: null,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    log('error', 'sc-worker', `SC submit failed for report ${data.reportId}: ${errorMsg}`)

    return {
      reportId: data.reportId,
      success: false,
      scCaseId: null,
      error: errorMsg,
    }
  } finally {
    await browser.close()
  }
}

export { processScSubmitJob }
