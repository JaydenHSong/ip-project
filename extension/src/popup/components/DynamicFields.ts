// 카테고리/타입별 동적 입력 필드

import { CATEGORY_FIELDS } from '@shared/constants'
import type { DynamicFieldConfig } from '@shared/constants'
import { getLocale } from '@shared/i18n'

type OnChangeCallback = (values: Record<string, string>, allRequiredFilled: boolean) => void

export const renderDynamicFields = (
  container: HTMLElement,
  fieldsKey: string | null,
  onChange: OnChangeCallback,
): void => {
  if (!fieldsKey) {
    container.innerHTML = ''
    onChange({}, false)
    return
  }

  const config = CATEGORY_FIELDS[fieldsKey]
  if (!config || config.fields.length === 0) {
    container.innerHTML = ''
    onChange({}, true)
    return
  }

  const locale = getLocale()
  const getLabel = (field: DynamicFieldConfig): string =>
    locale === 'ko' ? field.labelKo : field.labelEn

  container.innerHTML = config.fields
    .map(
      (field) => `
      <div class="form-group">
        <label class="form-label${field.required ? ' form-label--required' : ''}">${getLabel(field)}</label>
        <textarea
          id="field-${field.id}"
          class="form-textarea"
          rows="${field.rows}"
          maxlength="2000"
          data-field-id="${field.id}"
          data-required="${field.required}"
        ></textarea>
      </div>
    `,
    )
    .join('')

  const values: Record<string, string> = {}

  const checkRequired = (): boolean => {
    return config.fields
      .filter((f) => f.required)
      .every((f) => (values[f.id] ?? '').trim().length > 0)
  }

  config.fields.forEach((field) => {
    const textarea = container.querySelector(`#field-${field.id}`) as HTMLTextAreaElement
    values[field.id] = ''

    textarea.addEventListener('input', () => {
      values[field.id] = textarea.value
      onChange({ ...values }, checkRequired())
    })
  })

  // 초기 상태 전달
  onChange({ ...values }, checkRequired())
}
