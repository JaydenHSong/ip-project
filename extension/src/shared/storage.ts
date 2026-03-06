// chrome.storage.local 타입 안전 래퍼

import type { ExtensionStorage } from './types'

export const storage = {
  get: <K extends keyof ExtensionStorage>(key: K): Promise<ExtensionStorage[K] | null> => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve((result[key] as ExtensionStorage[K]) ?? null)
      })
    })
  },

  set: <K extends keyof ExtensionStorage>(key: K, value: ExtensionStorage[K]): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  },

  remove: (...keys: (keyof ExtensionStorage)[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys as string[], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  },

  clear: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  },
}
