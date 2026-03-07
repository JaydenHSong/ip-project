// Amazon Product Page "Report an issue" — Auto-click & auto-fill engine
// Runs on amazon.com/dp/* pages when Extension triggers front-end report
// Target: < 2 seconds total, user barely notices

import { getFrontReportData } from './front-report-templates'

// ============================================================
// Timing — fast but not instant (avoid bot detection)
// ============================================================
const STEP_DELAY = 150        // ms between each UI interaction
const DROPDOWN_WAIT = 200     // ms to wait for dropdown to render
const SUBMIT_DELAY = 300      // ms before final submit click

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms))

// ============================================================
// DOM helpers — Amazon product page selectors
// ============================================================

// "Report an issue" link on product page (below bullet points)
const findReportLink = (): HTMLElement | null => {
  // Method 1: text-based search for the link
  const links = document.querySelectorAll('a, span[role="button"], button')
  for (const el of links) {
    const text = el.textContent?.trim().toLowerCase() ?? ''
    if (text.includes('report an issue with this product') ||
        text.includes('report an issue')) {
      return el as HTMLElement
    }
  }

  // Method 2: known Amazon selectors
  return document.querySelector<HTMLElement>(
    '#report-abuse-link, ' +
    'a[href*="reportAbuse"], ' +
    '[data-action="report-abuse"], ' +
    '.report-abuse-link'
  )
}

// Wait for the modal to appear
const waitForModal = async (timeoutMs: number = 3000): Promise<HTMLElement | null> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    // Look for the Report an issue modal/dialog
    const modal = document.querySelector<HTMLElement>(
      '[data-a-modal-id*="report"], ' +
      '.a-modal-scroller, ' +
      '[role="dialog"]'
    )
    if (modal) {
      // Verify it's the report modal by checking for the heading
      const heading = modal.querySelector('h1, h2, .a-text-bold')
      if (heading?.textContent?.toLowerCase().includes('report')) {
        return modal
      }
    }
    await sleep(100)
  }
  return null
}

// Select a dropdown option by matching visible text
const selectDropdownOption = async (
  modal: HTMLElement,
  optionText: string,
): Promise<boolean> => {
  // Method 1: Native <select> element
  const selects = modal.querySelectorAll<HTMLSelectElement>('select')
  for (const select of selects) {
    for (const opt of select.options) {
      if (opt.text.trim() === optionText || opt.text.trim().includes(optionText)) {
        select.value = opt.value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        await sleep(DROPDOWN_WAIT)
        return true
      }
    }
  }

  // Method 2: Amazon custom dropdown (a-dropdown)
  const dropdownTriggers = modal.querySelectorAll<HTMLElement>('.a-dropdown-container, .a-button-dropdown')
  for (const trigger of dropdownTriggers) {
    trigger.click()
    await sleep(100)

    // Look for the dropdown list items
    const items = document.querySelectorAll<HTMLElement>(
      '.a-popover-content li, .a-dropdown-item, [role="option"]'
    )
    for (const item of items) {
      if (item.textContent?.trim() === optionText ||
          item.textContent?.trim().includes(optionText)) {
        item.click()
        await sleep(DROPDOWN_WAIT)
        return true
      }
    }
  }

  // Method 3: Radio buttons or clickable list items
  const listItems = modal.querySelectorAll<HTMLElement>(
    'li, label, .a-radio, [role="radio"], [role="option"]'
  )
  for (const item of listItems) {
    if (item.textContent?.trim() === optionText ||
        item.textContent?.trim().includes(optionText)) {
      const input = item.querySelector('input') ?? item
      ;(input as HTMLElement).click()
      await sleep(DROPDOWN_WAIT)
      return true
    }
  }

  return false
}

// Check checkboxes by label text
const checkCheckboxes = async (
  modal: HTMLElement,
  labels: string[],
): Promise<void> => {
  for (const labelText of labels) {
    const allLabels = modal.querySelectorAll<HTMLElement>('label, .a-checkbox-label')
    for (const label of allLabels) {
      if (label.textContent?.trim() === labelText) {
        const checkbox = label.querySelector<HTMLInputElement>('input[type="checkbox"]') ??
          label.previousElementSibling as HTMLInputElement | null
        if (checkbox && !checkbox.checked) {
          checkbox.click()
          await sleep(50)
        }
        break
      }
    }
  }
}

// Fill text into comment/details field
const fillTextField = (modal: HTMLElement, text: string): boolean => {
  const textareas = modal.querySelectorAll<HTMLTextAreaElement>('textarea')
  for (const ta of textareas) {
    // Use React-compatible value setter
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype, 'value'
    )?.set
    setter?.call(ta, text)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    ta.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  // Fallback: input fields
  const inputs = modal.querySelectorAll<HTMLInputElement>(
    'input[type="text"]:not([name="asin"])'
  )
  if (inputs.length > 0) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 'value'
    )?.set
    setter?.call(inputs[0], text)
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }

  return false
}

// Fill extra fields (e.g., Competitor Name, URL, Price for V13)
const fillExtraFields = async (
  modal: HTMLElement,
  fields: Record<string, string>,
): Promise<void> => {
  const inputMap: Record<string, string[]> = {
    competitorName: ['[name*="competitor" i]', '[name*="name" i]', '[placeholder*="name" i]'],
    competitorUrl: ['[name*="url" i]', '[name*="competitor_url" i]', '[placeholder*="URL" i]'],
    price: ['[name*="price" i]', 'input[type="number"]', '[placeholder*="$" i]'],
  }

  for (const [field, value] of Object.entries(fields)) {
    const selectors = inputMap[field] ?? [`[name="${field}"]`]
    for (const sel of selectors) {
      const input = modal.querySelector<HTMLInputElement>(sel)
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        )?.set
        setter?.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        break
      }
    }
  }
}

// Check the "good faith" checkbox (V04 counterfeit)
const checkGoodFaithBox = async (modal: HTMLElement): Promise<void> => {
  const checkboxes = modal.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
  for (const cb of checkboxes) {
    const label = cb.closest('label') ?? cb.parentElement
    if (label?.textContent?.toLowerCase().includes('good faith')) {
      if (!cb.checked) cb.click()
      return
    }
  }
  // If only one checkbox exists, it's likely the good faith one
  if (checkboxes.length === 1 && !checkboxes[0].checked) {
    checkboxes[0].click()
  }
}

// Click Submit button
const clickSubmit = async (modal: HTMLElement): Promise<boolean> => {
  const submitBtn = modal.querySelector<HTMLElement>(
    'input[type="submit"], button[type="submit"], .a-button-primary'
  ) ?? (() => {
    const buttons = modal.querySelectorAll<HTMLElement>('button, input[type="button"], span.a-button')
    for (const btn of buttons) {
      if (btn.textContent?.trim().toLowerCase() === 'submit') return btn
    }
    return null
  })()

  if (!submitBtn) return false

  await sleep(SUBMIT_DELAY)
  submitBtn.click()
  return true
}

// ============================================================
// Amazon login detection
// ============================================================

export const isAmazonLoggedIn = (): boolean => {
  // Check nav account link — shows "Hello, [Name]" when logged in
  const accountLink = document.querySelector('#nav-link-accountList')
  if (accountLink) {
    const greeting = accountLink.querySelector('.nav-line-1')
    const text = greeting?.textContent?.trim() ?? ''
    // "Hello, Sign in" = not logged in, "Hello, [Name]" = logged in
    return !text.toLowerCase().includes('sign in')
  }

  // Fallback: check for order history link (only visible when logged in)
  const orderLink = document.querySelector('#nav-orders')
  return orderLink !== null
}

// ============================================================
// Main auto-report engine
// ============================================================

export type FrontReportResult = {
  success: boolean
  track: 'front'
  violationCode: string
  durationMs: number
  error?: string
}

export const executeFrontReport = async (
  violationCode: string,
  data: {
    asin: string
    sellerName?: string
    brandName?: string
    aiDetails: string
    listingTitle?: string
    marketplace?: string
  },
): Promise<FrontReportResult> => {
  const start = Date.now()
  const elapsed = (): number => Date.now() - start

  // 1. Check if this violation type is front-reportable
  const config = getFrontReportData(violationCode, {
    ...data,
    violationType: violationCode,
    violationName: violationCode,
  })

  if (!config) {
    return {
      success: false, track: 'front', violationCode, durationMs: elapsed(),
      error: `${violationCode} is not front-reportable (IP types redirect)`,
    }
  }

  // 2. Check Amazon login
  if (!isAmazonLoggedIn()) {
    return {
      success: false, track: 'front', violationCode, durationMs: elapsed(),
      error: 'Amazon login not detected',
    }
  }

  // 3. Find and click "Report an issue" link
  const reportLink = findReportLink()
  if (!reportLink) {
    return {
      success: false, track: 'front', violationCode, durationMs: elapsed(),
      error: '"Report an issue" link not found on page',
    }
  }

  reportLink.click()
  await sleep(STEP_DELAY)

  // 4. Wait for modal
  const modal = await waitForModal()
  if (!modal) {
    return {
      success: false, track: 'front', violationCode, durationMs: elapsed(),
      error: 'Report modal did not appear',
    }
  }

  // 5. Select L1 dropdown
  const l1Selected = await selectDropdownOption(modal, config.l1)
  if (!l1Selected) {
    return {
      success: false, track: 'front', violationCode, durationMs: elapsed(),
      error: `L1 option not found: "${config.l1}"`,
    }
  }

  // 6. Select L2 if needed
  if (config.l2) {
    await sleep(STEP_DELAY)
    const l2Selected = await selectDropdownOption(modal, config.l2)
    if (!l2Selected) {
      return {
        success: false, track: 'front', violationCode, durationMs: elapsed(),
        error: `L2 option not found: "${config.l2}"`,
      }
    }
  }

  // 7. Select L3 if needed
  if (config.l3) {
    await sleep(STEP_DELAY)
    const l3Selected = await selectDropdownOption(modal, config.l3)
    if (!l3Selected) {
      // L3 fail is not critical — comment field should still be visible
    }
  }

  // 8. Check checkboxes if needed (e.g., "Parts don't match")
  if (config.checkboxes) {
    await sleep(STEP_DELAY)
    await checkCheckboxes(modal, config.checkboxes)
  }

  // 9. Good faith checkbox for counterfeit (V04)
  if (violationCode === 'V04') {
    await sleep(STEP_DELAY)
    await checkGoodFaithBox(modal)
  }

  // 10. Fill comment/details
  await sleep(STEP_DELAY)
  fillTextField(modal, config.filledComment)

  // 11. Fill extra fields if any
  if (config.filledExtraFields) {
    await sleep(STEP_DELAY)
    await fillExtraFields(modal, config.filledExtraFields)
  }

  // 12. Submit
  const submitted = await clickSubmit(modal)

  return {
    success: submitted,
    track: 'front',
    violationCode,
    durationMs: elapsed(),
    error: submitted ? undefined : 'Submit button not found',
  }
}
