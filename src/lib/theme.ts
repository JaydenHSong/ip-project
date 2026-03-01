type Theme = 'light' | 'dark'

const STORAGE_KEY = 'sentinel-theme'

export const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'dark'
}

export const setTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export const toggleTheme = (): Theme => {
  const current = getStoredTheme()
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

export const initTheme = (): void => {
  const theme = getStoredTheme()
  document.documentElement.setAttribute('data-theme', theme)
}
