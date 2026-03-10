// 제출 프리뷰 + 카운트다운 뷰

import type { ParsedPageData } from '@shared/types'
import type { ViolationCode, ViolationCategory } from '@shared/constants'
import { VIOLATION_TYPES, VIOLATION_CATEGORIES } from '@shared/constants'
import { t } from '@shared/i18n'
import { getLocale } from '@shared/i18n'
import { escapeHtml } from '../utils'

export type PreviewData = {
  pageData: ParsedPageData
  violationType: ViolationCode | ViolationCategory
  violationCategory: ViolationCategory
  note: string
  screenshotBase64: string
  extraFields?: Record<string, string>
}

const COUNTDOWN_SEC = 3
const SVG_CIRCUMFERENCE = 188.5 // 2 * PI * 30

export const renderPreviewView = (
  container: HTMLElement,
  data: PreviewData,
  onConfirm: () => void,
  onCancel: () => void,
): void => {
  const categoryKey = `cat.${data.violationCategory}` as Parameters<typeof t>[0]
  const isIp = data.violationCategory === 'intellectual_property'

  // IP는 V코드 + 이름, 나머지는 카테고리명
  let violationDisplay: string
  if (isIp && data.violationType in VIOLATION_TYPES) {
    const violation = VIOLATION_TYPES[data.violationType as ViolationCode]
    const name = getLocale() === 'ko' ? violation.nameKo : violation.nameEn
    violationDisplay = `${violation.code} &mdash; ${escapeHtml(name)}`
  } else {
    violationDisplay = VIOLATION_CATEGORIES[data.violationCategory] ?? data.violationCategory
  }

  // extra_fields 미리보기
  const extraFieldsHtml = data.extraFields
    ? Object.entries(data.extraFields)
        .filter(([, v]) => v.trim())
        .map(
          ([key, val]) => `
        <div class="preview-card__row">
          <span class="preview-card__label">${escapeHtml(key)}</span>
          <span class="preview-card__value preview-card__value--note">${escapeHtml(val)}</span>
        </div>`,
        )
        .join('')
    : ''

  container.innerHTML = `
    <div class="preview-container">
      <h2 class="preview-header">${t('preview.title')}</h2>

      <div class="preview-card">
        <div class="preview-card__row">
          <span class="preview-card__label">${t('preview.label.asin')}</span>
          <span class="preview-card__value preview-card__value--accent">${escapeHtml(data.pageData.asin)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${t('preview.label.product')}</span>
          <span class="preview-card__value preview-card__value--title">${escapeHtml(data.pageData.title)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${t('preview.label.marketplace')}</span>
          <span class="preview-card__value">${escapeHtml(data.pageData.marketplace)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${t('preview.label.category')}</span>
          <span class="preview-card__value">${t(categoryKey)}</span>
        </div>
        ${isIp ? `
        <div class="preview-card__row">
          <span class="preview-card__label">${t('preview.label.violation')}</span>
          <span class="preview-card__value">${violationDisplay}</span>
        </div>
        ` : ''}
        ${extraFieldsHtml}
        <div class="preview-card__row">
          <span class="preview-card__label">${t('preview.label.screenshot')}</span>
          <span class="preview-card__value preview-card__value--muted">${t('preview.screenshot.auto')}</span>
        </div>
      </div>

      <div class="countdown-area">
        <svg class="countdown-ring" viewBox="0 0 64 64">
          <circle class="countdown-ring__bg" cx="32" cy="32" r="30" fill="none" stroke="var(--border)" stroke-width="3" />
          <circle id="countdown-circle" class="countdown-ring__circle" cx="32" cy="32" r="30" fill="none" stroke="var(--accent)" stroke-width="3"
            stroke-dasharray="${SVG_CIRCUMFERENCE}" stroke-dashoffset="0"
            stroke-linecap="round" />
          <text id="countdown-text" class="countdown-ring__text" x="32" y="36" text-anchor="middle" fill="var(--text-primary)" font-size="16" font-weight="600">${COUNTDOWN_SEC}</text>
        </svg>
        <p class="countdown-label">${t('preview.countdown')}</p>
      </div>

      <button id="btn-preview-cancel" class="btn btn--ghost">${t('common.cancel')}</button>
    </div>
  `

  const circle = container.querySelector('#countdown-circle') as SVGCircleElement
  const textEl = container.querySelector('#countdown-text') as SVGTextElement
  const cancelBtn = container.querySelector('#btn-preview-cancel') as HTMLButtonElement

  let elapsed = 0
  let cancelled = false

  // SW에 payload 임시 저장 (팝업 닫힘 대비)
  chrome.runtime.sendMessage({
    type: 'PREPARE_REPORT',
    payload: {
      page_data: data.pageData,
      violation_type: data.violationType,
      violation_category: data.violationCategory,
      note: data.note,
      screenshot_base64: data.screenshotBase64,
      extra_fields: data.extraFields,
    },
  })

  const timer = setInterval(() => {
    if (cancelled) return

    elapsed += 100
    const progress = elapsed / (COUNTDOWN_SEC * 1000)
    circle.setAttribute('stroke-dashoffset', String(SVG_CIRCUMFERENCE * progress))

    const remaining = Math.ceil((COUNTDOWN_SEC * 1000 - elapsed) / 1000)
    textEl.textContent = String(remaining)

    if (elapsed >= COUNTDOWN_SEC * 1000) {
      clearInterval(timer)
      onConfirm()
    }
  }, 100)

  cancelBtn.addEventListener('click', () => {
    cancelled = true
    clearInterval(timer)
    // 임시 저장된 payload 제거
    try {
      chrome.storage.session.remove('pending_report')
    } catch {
      // storage 접근 실패 시 무시
    }
    onCancel()
  })

  // 팝업 닫힘 시 SW에서 전송하도록 CONFIRM_REPORT 전송
  window.addEventListener('beforeunload', () => {
    if (!cancelled && elapsed < COUNTDOWN_SEC * 1000) {
      try {
        chrome.runtime.sendMessage({ type: 'CONFIRM_REPORT' })
      } catch {
        // Extension context invalidated — SW가 알아서 pending_report 전송
      }
    }
  })
}
