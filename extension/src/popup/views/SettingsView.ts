// Language + Theme + Background Fetch 설정 뷰

import { t, getLocale, setLocale, getTheme, setTheme } from '@shared/i18n'
import type { Locale, Theme } from '@shared/i18n'

type BgFetchSettings = {
  enabled: boolean
}

export const renderSettingsView = (
  container: HTMLElement,
  onBack: () => void,
  onLocaleChange?: () => void,
): void => {
  chrome.storage.local.get(['bgfetch.settings'], (result) => {
    const bgSettings: BgFetchSettings = (result['bgfetch.settings'] as BgFetchSettings) ?? { enabled: true }
    const locale = getLocale()
    const theme = getTheme()

    container.innerHTML = `
      <div class="settings-container">
        <div class="settings-header">
          <button id="btn-settings-back" class="settings-header__back">&larr;</button>
          <h2 class="settings-header__title">${t('settings.title')}</h2>
        </div>

        <div class="settings-section">
          <h3 class="settings-section__title">${t('settings.language')}</h3>
          <div class="settings-lang-switcher">
            <button class="settings-lang-btn ${locale === 'en' ? 'settings-lang-btn--active' : ''}" data-lang="en">EN</button>
            <button class="settings-lang-btn ${locale === 'ko' ? 'settings-lang-btn--active' : ''}" data-lang="ko">KO</button>
          </div>
        </div>

        <div class="settings-divider"></div>

        <div class="settings-section">
          <h3 class="settings-section__title">${t('settings.theme')}</h3>
          <div class="settings-lang-switcher">
            <button class="settings-lang-btn settings-theme-btn ${theme === 'light' ? 'settings-lang-btn--active' : ''}" data-theme="light">☀️ ${t('settings.theme.light')}</button>
            <button class="settings-lang-btn settings-theme-btn ${theme === 'dark' ? 'settings-lang-btn--active' : ''}" data-theme="dark">🌙 ${t('settings.theme.dark')}</button>
          </div>
        </div>

        <div class="settings-divider"></div>

        <div class="settings-section">
          <h3 class="settings-section__title">${t('settings.bgfetch.title')}</h3>

          <label class="settings-toggle-row">
            <span class="toggle-switch">
              <input type="checkbox" id="bgfetch-toggle" ${bgSettings.enabled ? 'checked' : ''} />
              <span class="toggle-switch__slider"></span>
            </span>
            <span class="settings-toggle-row__label">${t('settings.bgfetch.toggle')}</span>
          </label>

          <p class="settings-hint">${t('settings.bgfetch.hint1')}</p>
          <p class="settings-hint" style="margin-top:4px">${t('settings.bgfetch.hint2')}</p>
          <p class="settings-hint settings-hint--info" style="margin-top:4px">${t('settings.bgfetch.hint3')}</p>
        </div>
      </div>
    `

    container.querySelector('#btn-settings-back')?.addEventListener('click', onBack)

    // Language switcher
    container.querySelectorAll<HTMLButtonElement>('.settings-lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang as Locale
        if (lang === getLocale()) return
        setLocale(lang)
        renderSettingsView(container, onBack, onLocaleChange)
        onLocaleChange?.()
      })
    })

    // Theme switcher
    container.querySelectorAll<HTMLButtonElement>('.settings-theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const newTheme = btn.dataset.theme as Theme
        if (newTheme === getTheme()) return
        setTheme(newTheme)
        renderSettingsView(container, onBack, onLocaleChange)
      })
    })

    const saveBgFetchSettings = (): void => {
      const toggle = container.querySelector<HTMLInputElement>('#bgfetch-toggle')
      chrome.storage.local.set({
        'bgfetch.settings': {
          enabled: toggle?.checked ?? false,
        } satisfies BgFetchSettings,
      })
    }

    container.querySelector('#bgfetch-toggle')?.addEventListener('change', saveBgFetchSettings)
  })
}
