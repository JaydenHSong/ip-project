// SC 자동 제출 설정 뷰

type ScAutoSettings = {
  autoSubmitEnabled: boolean
  countdownSeconds: number
  minDelaySec: number
  maxDelaySec: number
}

const DEFAULTS: ScAutoSettings = {
  autoSubmitEnabled: false,
  countdownSeconds: 3,
  minDelaySec: 30,
  maxDelaySec: 60,
}

export const renderSettingsView = (
  container: HTMLElement,
  onBack: () => void,
): void => {
  chrome.storage.local.get(['sc_auto_settings'], (result) => {
    const settings: ScAutoSettings = (result.sc_auto_settings as ScAutoSettings) ?? DEFAULTS

    container.innerHTML = `
      <div style="padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <button id="btn-settings-back" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;">
            &larr;
          </button>
          <h2 style="margin: 0; font-size: 15px; font-weight: 600;">SC Auto Submit</h2>
        </div>

        <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; cursor: pointer;">
          <input type="checkbox" id="auto-submit-toggle" ${settings.autoSubmitEnabled ? 'checked' : ''} />
          <span style="font-size: 13px;">Enable Auto Submit</span>
        </label>

        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">Countdown (seconds)</label>
          <select id="countdown-select" style="width: 100%; padding: 6px 8px; border: 1px solid #444; border-radius: 6px; background: #1a1a2e; color: #fff; font-size: 13px;">
            <option value="3" ${settings.countdownSeconds === 3 ? 'selected' : ''}>3 seconds</option>
            <option value="5" ${settings.countdownSeconds === 5 ? 'selected' : ''}>5 seconds</option>
            <option value="10" ${settings.countdownSeconds === 10 ? 'selected' : ''}>10 seconds</option>
          </select>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">Batch Delay</label>
          <select id="delay-select" style="width: 100%; padding: 6px 8px; border: 1px solid #444; border-radius: 6px; background: #1a1a2e; color: #fff; font-size: 13px;">
            <option value="30" ${settings.minDelaySec === 30 ? 'selected' : ''}>30~60s</option>
            <option value="60" ${settings.minDelaySec === 60 ? 'selected' : ''}>60~90s</option>
            <option value="90" ${settings.minDelaySec === 90 ? 'selected' : ''}>90~120s</option>
          </select>
        </div>

        <p style="font-size: 11px; color: #666; margin: 0;">
          Auto submit also requires Admin to enable it in Sentinel Web Settings.
        </p>
      </div>
    `

    container.querySelector('#btn-settings-back')?.addEventListener('click', onBack)

    const saveSettings = (): void => {
      const toggle = container.querySelector<HTMLInputElement>('#auto-submit-toggle')
      const countdown = container.querySelector<HTMLSelectElement>('#countdown-select')
      const delayEl = container.querySelector<HTMLSelectElement>('#delay-select')
      const minDelay = Number(delayEl?.value ?? 30)

      chrome.storage.local.set({
        sc_auto_settings: {
          autoSubmitEnabled: toggle?.checked ?? false,
          countdownSeconds: Number(countdown?.value ?? 3),
          minDelaySec: minDelay,
          maxDelaySec: minDelay + 30,
        } satisfies ScAutoSettings,
      })
    }

    container.querySelector('#auto-submit-toggle')?.addEventListener('change', saveSettings)
    container.querySelector('#countdown-select')?.addEventListener('change', saveSettings)
    container.querySelector('#delay-select')?.addEventListener('change', saveSettings)
  })
}
