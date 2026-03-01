// chrome.storage.local 타입 안전 래퍼

import type { ExtensionStorage } from './types'

export const storage = {
  get: <K extends keyof ExtensionStorage>(key: K): Promise<ExtensionStorage[K] | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve((result[key] as ExtensionStorage[K]) ?? null)
      })
    })
  },

  set: <K extends keyof ExtensionStorage>(key: K, value: ExtensionStorage[K]): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve)
    })
  },

  remove: (...keys: (keyof ExtensionStorage)[]): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys as string[], resolve)
    })
  },

  clear: (): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve)
    })
  },
}
