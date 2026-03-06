// 위반 유형 2단계 셀렉터 (카테고리 → 유형)

import { VIOLATION_GROUPS } from '@shared/constants'
import type { ViolationCategory, ViolationCode } from '@shared/constants'
import { t, getLocale } from '@shared/i18n'

type OnChangeCallback = (violationType: ViolationCode | null, category: ViolationCategory | null) => void

const CATEGORY_KEYS: ViolationCategory[] = [
  'intellectual_property',
  'listing_content',
  'review_manipulation',
  'selling_practice',
  'regulatory_safety',
]

export const renderViolationSelector = (
  container: HTMLElement,
  onChange: OnChangeCallback,
): void => {
  const locale = getLocale()

  container.innerHTML = `
    <div class="form-group">
      <label class="form-label form-label--required">${t('form.violation')}</label>
      <select id="select-category" class="form-select">
        <option value="">${t('form.category.placeholder')}</option>
        ${CATEGORY_KEYS
          .map((key) => `<option value="${key}">${t(`cat.${key}` as Parameters<typeof t>[0])}</option>`)
          .join('')}
      </select>
      <select id="select-violation" class="form-select" disabled>
        <option value="">${t('form.violation.placeholder')}</option>
      </select>
    </div>
  `

  const categorySelect = container.querySelector('#select-category') as HTMLSelectElement
  const violationSelect = container.querySelector('#select-violation') as HTMLSelectElement

  categorySelect.addEventListener('change', () => {
    const category = categorySelect.value as ViolationCategory | ''

    if (!category) {
      violationSelect.innerHTML = `<option value="">${t('form.violation.placeholder')}</option>`
      violationSelect.disabled = true
      onChange(null, null)
      return
    }

    const violations = VIOLATION_GROUPS[category] ?? []
    const name = (v: typeof violations[number]): string =>
      locale === 'ko' ? v.nameKo : v.nameEn

    violationSelect.innerHTML = `
      <option value="">${t('form.violation.placeholder')}</option>
      ${violations
        .map((v) => `<option value="${v.code}">${v.code} — ${name(v)}</option>`)
        .join('')}
    `
    violationSelect.disabled = false
    violationSelect.value = ''
    onChange(null, category)
  })

  violationSelect.addEventListener('change', () => {
    const code = violationSelect.value as ViolationCode | ''
    const category = categorySelect.value as ViolationCategory | ''
    onChange(code || null, category || null)
  })
}
