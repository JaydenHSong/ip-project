// 위반 신고 폼 뷰

import type { ParsedPageData } from '@shared/types'
import type { ViolationCategory, ViolationCode } from '@shared/constants'
import type { BackgroundResponse } from '@shared/messages'
import type { PreviewData } from './PreviewView'
import { t } from '@shared/i18n'
import { renderViolationSelector } from '../components/ViolationSelector'
import { renderDynamicFields } from '../components/DynamicFields'
import { renderSubmitButton, setSubmitEnabled, setSubmitLoading } from '../components/SubmitButton'
import { escapeHtml } from '../utils'

type FormState = {
  violationType: ViolationCode | null
  violationCategory: ViolationCategory | null
  extraFields: Record<string, string>
  requiredFieldsFilled: boolean
}

export const renderReportFormView = (
  container: HTMLElement,
  pageData: ParsedPageData,
  onPreview: (data: PreviewData) => void,
): void => {
  const state: FormState = {
    violationType: null,
    violationCategory: null,
    extraFields: {},
    requiredFieldsFilled: false,
  }

  const mp = escapeHtml(pageData.marketplace)

  container.innerHTML = `
    <div class="popup-content">
      <div class="product-info">
        <span class="product-info__asin">${escapeHtml(pageData.asin)}</span>
        <p class="product-info__title">${escapeHtml(pageData.title)}</p>
        ${pageData.seller_name ? `<span class="product-info__seller">${t('form.seller')}: ${escapeHtml(pageData.seller_name)}</span>` : ''}
        <span class="product-info__marketplace">${mp}</span>
      </div>
      <div id="violation-selector"></div>
      <div id="dynamic-fields"></div>
      <div id="submit-area"></div>
      <div id="form-error" class="error-text hidden"></div>
    </div>
  `

  const violationContainer = container.querySelector('#violation-selector') as HTMLElement
  const fieldsContainer = container.querySelector('#dynamic-fields') as HTMLElement
  const submitContainer = container.querySelector('#submit-area') as HTMLElement
  const errorEl = container.querySelector('#form-error') as HTMLElement

  // 선택 완료 여부: IP는 type 선택 필수, 나머지는 category만으로 충분
  const isSelectionComplete = (): boolean => {
    if (!state.violationCategory) return false
    if (state.violationCategory === 'intellectual_property') return state.violationType !== null
    return true
  }

  const updateSubmitState = (): void => {
    setSubmitEnabled(isSelectionComplete() && state.requiredFieldsFilled)
  }

  // 동적 필드 키 결정: IP는 ViolationCode (V01~V04), 나머지는 category
  const getFieldsKey = (): string | null => {
    if (!state.violationCategory) return null
    if (state.violationCategory === 'intellectual_property') {
      return state.violationType // V01, V02, V03, V04 or null
    }
    return state.violationCategory
  }

  const renderFields = (): void => {
    const key = getFieldsKey()
    renderDynamicFields(fieldsContainer, key, (values, allFilled) => {
      state.extraFields = values
      state.requiredFieldsFilled = allFilled
      updateSubmitState()
    })
  }

  renderViolationSelector(violationContainer, (type, category) => {
    state.violationType = type
    state.violationCategory = category
    renderFields()
    updateSubmitState()
  })

  renderSubmitButton(submitContainer, async () => {
    if (!isSelectionComplete() || !state.violationCategory) return

    setSubmitLoading(true)
    errorEl.classList.add('hidden')

    // 스크린샷 캡처
    const screenshotResponse = await new Promise<BackgroundResponse<string>>((resolve) => {
      chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, resolve)
    })

    const screenshot = screenshotResponse.success ? screenshotResponse.data : ''
    setSubmitLoading(false)

    // violation_type 결정: IP는 V코드, 나머지는 카테고리명
    const violationType = state.violationCategory === 'intellectual_property'
      ? state.violationType!
      : state.violationCategory

    // note 조합: extra_fields를 구조화된 텍스트로
    const noteLines = Object.entries(state.extraFields)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `[${k}]\n${v}`)
    const note = noteLines.join('\n\n')

    // Preview 화면으로 전환
    onPreview({
      pageData,
      violationType: violationType as ViolationCode,
      violationCategory: state.violationCategory,
      note,
      screenshotBase64: screenshot,
      extraFields: Object.keys(state.extraFields).length > 0 ? state.extraFields : undefined,
    })
  })
}
