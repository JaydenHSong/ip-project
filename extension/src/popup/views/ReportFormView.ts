// 위반 신고 폼 뷰

import type { ParsedPageData } from '@shared/types'
import type { ViolationCategory, ViolationCode } from '@shared/constants'
import { MARKETPLACE_MAP } from '@shared/constants'
import type { BackgroundResponse } from '@shared/messages'
import { renderViolationSelector } from '../components/ViolationSelector'
import { renderNoteInput } from '../components/NoteInput'
import { renderSubmitButton, setSubmitEnabled, setSubmitLoading } from '../components/SubmitButton'

type FormState = {
  violationType: ViolationCode | null
  violationCategory: ViolationCategory | null
  note: string
}

const escapeHtml = (str: string): string => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

export const renderReportFormView = (
  container: HTMLElement,
  pageData: ParsedPageData,
  onSubmitSuccess: (reportId: string) => void,
): void => {
  const state: FormState = {
    violationType: null,
    violationCategory: null,
    note: '',
  }

  const mp = escapeHtml(pageData.marketplace)

  container.innerHTML = `
    <div class="popup-content">
      <div class="product-info">
        <span class="product-info__asin">${escapeHtml(pageData.asin)}</span>
        <p class="product-info__title">${escapeHtml(pageData.title)}</p>
        ${pageData.seller_name ? `<span class="product-info__seller">Seller: ${escapeHtml(pageData.seller_name)}</span>` : ''}
        <span class="product-info__marketplace">${mp}</span>
      </div>
      <div id="violation-selector"></div>
      <div id="note-input"></div>
      <div id="submit-area"></div>
      <div id="form-error" class="error-text hidden"></div>
    </div>
  `

  const violationContainer = container.querySelector('#violation-selector') as HTMLElement
  const noteContainer = container.querySelector('#note-input') as HTMLElement
  const submitContainer = container.querySelector('#submit-area') as HTMLElement
  const errorEl = container.querySelector('#form-error') as HTMLElement

  const updateSubmitState = (): void => {
    setSubmitEnabled(state.violationType !== null)
  }

  renderViolationSelector(violationContainer, (type, category) => {
    state.violationType = type
    state.violationCategory = category
    updateSubmitState()
  })

  renderNoteInput(noteContainer, (note) => {
    state.note = note
  })

  renderSubmitButton(submitContainer, async () => {
    if (!state.violationType || !state.violationCategory) return

    setSubmitLoading(true)
    errorEl.classList.add('hidden')

    // 스크린샷 캡처
    const screenshotResponse = await new Promise<BackgroundResponse<string>>((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, resolve)
    })

    const screenshot = screenshotResponse.success ? screenshotResponse.data : ''

    // 신고 제출
    chrome.runtime.sendMessage(
      {
        type: 'SUBMIT_REPORT',
        payload: {
          page_data: pageData,
          violation_type: state.violationType,
          violation_category: state.violationCategory,
          note: state.note,
          screenshot_base64: screenshot,
        },
      },
      (response: BackgroundResponse<{ report_id: string }>) => {
        setSubmitLoading(false)

        if (response?.success) {
          onSubmitSuccess(response.data.report_id)
        } else {
          errorEl.textContent = response?.error ?? 'Submission failed. Please try again.'
          errorEl.classList.remove('hidden')
        }
      },
    )
  })
}
