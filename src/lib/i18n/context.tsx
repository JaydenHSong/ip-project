'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { type Locale, type Messages, getStoredLocale, setLocale, getMessages, createT } from './index'

type I18nContextValue = {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
  changeLocale: (locale: Locale) => void
  messages: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    setLocaleState(getStoredLocale())
  }, [])

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    setLocaleState(newLocale)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const translate = createT(locale)
      return translate(key as Parameters<typeof translate>[0], params)
    },
    [locale],
  )

  const msgs = getMessages(locale)

  // Always provide context so children never use useI18n() fallback (en-only) during initial render.
  return (
    <I18nContext.Provider value={{ locale, t, changeLocale, messages: msgs }}>
      {children}
    </I18nContext.Provider>
  )
}

const fallbackT = (key: string, params?: Record<string, string | number>): string => {
  const translate = createT('en')
  return translate(key as Parameters<typeof translate>[0], params)
}

const fallbackValue: I18nContextValue = {
  locale: 'en',
  t: fallbackT,
  changeLocale: () => {},
  messages: getMessages('en'),
}

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext)
  return context ?? fallbackValue
}
