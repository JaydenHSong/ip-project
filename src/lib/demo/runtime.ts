import { DEMO_NOTICES } from './data'
import type { Notice } from '@/types/notices'

const preferenceStore = new Map<string, unknown>()
const noticeReadStore = new Map<string, Set<string>>()
const declineCheckStore = new Map<string, string>()

const buildPreferenceKey = (userId: string, key: string): string => `${userId}:${key}`

const getNoticeReadSet = (userId: string): Set<string> => {
  const existing = noticeReadStore.get(userId)
  if (existing) return existing

  const next = new Set<string>()
  noticeReadStore.set(userId, next)
  return next
}

const sortDemoNotices = (left: Notice, right: Notice): number => {
  if (left.is_pinned !== right.is_pinned) return left.is_pinned ? -1 : 1
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
}

export const getDemoPreference = (userId: string, key: string): unknown | null =>
  preferenceStore.get(buildPreferenceKey(userId, key)) ?? null

export const setDemoPreference = (userId: string, key: string, value: unknown): void => {
  preferenceStore.set(buildPreferenceKey(userId, key), value)
}

export const getDemoNotices = (): Notice[] => [...DEMO_NOTICES].sort(sortDemoNotices)

export const getUnreadDemoNotices = (userId: string): Notice[] => {
  const readIds = noticeReadStore.get(userId)
  return getDemoNotices().filter((notice) => !readIds?.has(notice.id))
}

export const markDemoNoticeRead = (userId: string, noticeId: string): void => {
  getNoticeReadSet(userId).add(noticeId)
}

export const getDemoDeclineCheckAt = (userId: string): string | null =>
  declineCheckStore.get(userId) ?? null

export const setDemoDeclineCheckAt = (userId: string, value: string): void => {
  declineCheckStore.set(userId, value)
}
