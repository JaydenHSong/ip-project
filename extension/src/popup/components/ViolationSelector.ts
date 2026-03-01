// 위반 유형 2단계 셀렉터 (카테고리 → 유형)

import { VIOLATION_CATEGORIES, VIOLATION_GROUPS } from '@shared/constants'
import type { ViolationCategory, ViolationCode } from '@shared/constants'

type OnChangeCallback = (violationType: ViolationCode | null, category: ViolationCategory | null) => void

export const renderViolationSelector = (
  container: HTMLElement,
  onChange: OnChangeCallback,
): void => {
  container.innerHTML = `
    <div class="form-group">
      <label class="form-label form-label--required">Violation Type</label>
      <select id="select-category" class="form-select">
        <option value="">Select Category</option>
        ${Object.entries(VIOLATION_CATEGORIES)
          .map(([key, label]) => `<option value="${key}">${label}</option>`)
          .join('')}
      </select>
      <select id="select-violation" class="form-select" disabled>
        <option value="">Select Violation Type</option>
      </select>
    </div>
  `

  const categorySelect = container.querySelector('#select-category') as HTMLSelectElement
  const violationSelect = container.querySelector('#select-violation') as HTMLSelectElement

  categorySelect.addEventListener('change', () => {
    const category = categorySelect.value as ViolationCategory | ''

    if (!category) {
      violationSelect.innerHTML = '<option value="">Select Violation Type</option>'
      violationSelect.disabled = true
      onChange(null, null)
      return
    }

    const violations = VIOLATION_GROUPS[category] ?? []
    violationSelect.innerHTML = `
      <option value="">Select Violation Type</option>
      ${violations
        .map((v) => `<option value="${v.code}">${v.code} — ${v.nameEn}</option>`)
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
