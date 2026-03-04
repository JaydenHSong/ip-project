// 패시브 수집 배치 큐 + 중복 필터 + 전송
// Service Worker에서 사용

import { storage } from '@shared/storage'
import type { PassivePageData, PassiveSearchData, PassiveQueueItem, DedupeEntry } from '@shared/types'
import { submitPassiveCollect } from './api'

const BATCH_SIZE = 10
const MAX_QUEUE_SIZE = 100
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000 // 24시간
const MAX_RETRIES = 3

let flushInProgress = false

const getDedupeKey = (type: 'page' | 'search', data: PassivePageData | PassiveSearchData): string => {
  if (type === 'page') {
    const d = data as PassivePageData
    return `page:${d.asin}:${d.marketplace}`
  }
  const d = data as PassiveSearchData
  return `search:${d.search_term}:${d.marketplace}:${d.page_number}`
}

const isDuplicate = async (key: string): Promise<boolean> => {
  const dedup = (await storage.get('passive.dedup')) ?? []
  const now = Date.now()
  return dedup.some((entry) => entry.key === key && entry.expires_at > now)
}

const addDedup = async (key: string): Promise<void> => {
  const dedup = (await storage.get('passive.dedup')) ?? []
  dedup.push({ key, expires_at: Date.now() + DEDUP_TTL_MS })
  await storage.set('passive.dedup', dedup)
}

export const enqueue = async (
  type: 'page' | 'search',
  data: PassivePageData | PassiveSearchData,
): Promise<void> => {
  const key = getDedupeKey(type, data)
  if (await isDuplicate(key)) return

  await addDedup(key)

  const queue = (await storage.get('passive.queue')) ?? []

  const item: PassiveQueueItem = {
    id: crypto.randomUUID(),
    type,
    data,
    collected_at: new Date().toISOString(),
  }

  queue.push(item)

  // FIFO: 최대 크기 초과 시 오래된 것 제거
  while (queue.length > MAX_QUEUE_SIZE) {
    queue.shift()
  }

  await storage.set('passive.queue', queue)

  if (queue.length >= BATCH_SIZE) {
    flush()
  }
}

export const flush = async (): Promise<void> => {
  if (flushInProgress) return
  flushInProgress = true

  try {
    const queue = (await storage.get('passive.queue')) ?? []
    if (queue.length === 0) return

    const batch = queue.slice(0, BATCH_SIZE)
    const remaining = queue.slice(BATCH_SIZE)

    let retries = 0
    let success = false

    while (retries < MAX_RETRIES && !success) {
      try {
        await submitPassiveCollect(batch)
        success = true
      } catch {
        retries++
        if (retries < MAX_RETRIES) {
          // 지수 백오프: 1분, 2분, 4분
          await new Promise((r) => setTimeout(r, Math.pow(2, retries - 1) * 60_000))
        }
      }
    }

    if (success) {
      await storage.set('passive.queue', remaining)
      // 아직 남은 데이터가 BATCH_SIZE 이상이면 계속 전송
      if (remaining.length >= BATCH_SIZE) {
        flushInProgress = false
        flush()
        return
      }
    }
    // 실패 시 큐에 유지 (다음 alarm에서 재시도)
  } finally {
    flushInProgress = false
  }
}

export const cleanExpiredDedup = async (): Promise<void> => {
  const dedup = (await storage.get('passive.dedup')) ?? []
  const now = Date.now()
  const valid = dedup.filter((entry) => entry.expires_at > now)
  await storage.set('passive.dedup', valid)
}
