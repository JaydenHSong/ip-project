// 메모 입력 컴포넌트

type OnChangeCallback = (note: string) => void

export const renderNoteInput = (
  container: HTMLElement,
  onChange: OnChangeCallback,
): void => {
  container.innerHTML = `
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <textarea
        id="note-input"
        class="form-textarea"
        placeholder="Describe the violation..."
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
