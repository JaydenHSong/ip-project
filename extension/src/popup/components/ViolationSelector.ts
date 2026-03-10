// 위반 유형 셀렉터 — IP만 2단계, 나머지는 1단계

import { CATEGORY_ORDER, IP_TYPES, VIOLATION_TYPES } from '@shared/constants'
import type { ViolationCategory, ViolationCode } from '@shared/constants'
import { t, getLocale } from '@shared/i18n'

type OnChangeCallback = (
  violationType: ViolationCode | null,
  category: ViolationCategory | null,
) => void

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
        ${CATEGORY_ORDER
          .map((key) => `<option value="${key}">${t(`cat.${key}` as Parameters<typeof t>[0])}</option>`)
          .join('')}
      </select>
      <select id="select-violation" class="form-select hidden">
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
      violationSelect.classList.add('hidden')
      onChange(null, null)
      return
    }

    if (category === 'intellectual_property') {
      // IP: 2단계 — V01~V04 타입 선택 드롭다운 표시
      const name = (code: ViolationCode): string => {
        const v = VIOLATION_TYPES[code]
        return locale === 'ko' ? v.nameKo : v.nameEn
      }
      violationSelect.innerHTML = `
        <option value="">${t('form.violation.placeholder')}</option>
        ${IP_TYPES
          .map((code) => `<option value="${code}">${code} — ${name(code)}</option>`)
          .join('')}
      `
      violationSelect.classList.remove('hidden')
      violationSelect.value = ''
      onChange(null, category)
    } else {
      // 나머지 5개 카테고리: 1단계 — 바로 선택 완료
      violationSelect.classList.add('hidden')
      onChange(null, category)
    }
  })

  violationSelect.addEventListener('change', () => {
    const code = violationSelect.value as ViolationCode | ''
    const category = categorySelect.value as ViolationCategory | ''
    onChange(code || null, category || null)
  })
}
