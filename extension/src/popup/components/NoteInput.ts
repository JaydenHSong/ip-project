// 메모 입력 컴포넌트

import { t } from '@shared/i18n'

type OnChangeCallback = (note: string) => void

export const renderNoteInput = (
  container: HTMLElement,
  onChange: OnChangeCallback,
): void => {
  container.innerHTML = `
    <div class="form-group">
      <label class="form-label">${t('form.note.label')}</label>
      <textarea
        id="note-input"
        class="form-textarea"
        placeholder="${t('form.note.placeholder')}"
        rows="4"
        maxlength="2000"
      ></textarea>
    </div>
  `

  const textarea = container.querySelector('#note-input') as HTMLTextAreaElement
  textarea.addEventListener('input', () => {
    onChange(textarea.value)
  })
}
