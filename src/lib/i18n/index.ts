import { en } from './locales/en'
import { ko } from './locales/ko'

export type Locale = 'en' | 'ko'

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type Messages = DeepStringify<typeof en>

const STORAGE_KEY = 'sentinel-locale'

const messages: Record<Locale, Messages> = { en, ko }

export const getStoredLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  return stored ?? 'en'
}

export const setLocale = (locale: Locale): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, locale)
}

export const toggleLocale = (): Locale => {
  const current = getStoredLocale()
  const next: Locale = current === 'ko' ? 'en' : 'ko'
  setLocale(next)
  return next
}

export const getMessages = (locale: Locale): Messages => messages[locale]

type NestedKeyOf<T> = T extends string
  ? ''
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${NestedKeyOf<T[K]>}`
    }[keyof T & string]

type TranslationKey = NestedKeyOf<Messages>

const getNestedValue = (obj: unknown, path: string): string => {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : path
}

export const createT = (locale: Locale) => {
  const msgs = messages[locale]
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    let value = getNestedValue(msgs, key)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v))
      })
    }
    return value
  }
}
