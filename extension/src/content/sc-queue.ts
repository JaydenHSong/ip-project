// 배치 제출 큐 관리
// chrome.storage.local에 큐 저장, 순차 처리, 랜덤 딜레이

type QueueItem = {
  reportId: string
  status: 'pending' | 'processing' | 'done' | 'failed'
}

type QueueState = {
  items: QueueItem[]
  processing: boolean
}

const STORAGE_KEY = 'sentinel_sc_queue'

export const loadQueue = async (): Promise<QueueState> =>
  new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve((result[STORAGE_KEY] as QueueState) ?? { items: [], processing: false })
    })
  })

export const saveQueue = async (state: QueueState): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve)
  })

export const enqueue = async (reportId: string): Promise<void> => {
  const state = await loadQueue()
  if (state.items.some((item) => item.reportId === reportId)) return
  state.items.push({ reportId, status: 'pending' })
  await saveQueue(state)
}

export const dequeue = async (): Promise<QueueItem | null> => {
  const state = await loadQueue()
  const next = state.items.find((item) => item.status === 'pending')
  if (!next) return null
  next.status = 'processing'
  state.processing = true
  await saveQueue(state)
  return next
}

export const markItem = async (
  reportId: string,
  status: 'done' | 'failed',
): Promise<void> => {
  const state = await loadQueue()
  const item = state.items.find((i) => i.reportId === reportId)
  if (item) item.status = status
  state.processing = false
  await saveQueue(state)
}

export const getRandomDelay = (minSec: number, maxSec: number): number =>
  (minSec + Math.random() * (maxSec - minSec)) * 1000

export const getQueueSummary = async (): Promise<{
  total: number
  pending: number
  done: number
  failed: number
}> => {
  const state = await loadQueue()
  return {
    total: state.items.length,
    pending: state.items.filter((i) => i.status === 'pending').length,
    done: state.items.filter((i) => i.status === 'done').length,
    failed: state.items.filter((i) => i.status === 'failed').length,
  }
}

export const clearQueue = async (): Promise<void> => {
  await saveQueue({ items: [], processing: false })
}
