'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type UseInfiniteScrollOptions<T> = {
  initialData: T[]
  totalCount: number
  pageSize: number
  fetchUrl: string
  filterParams: Record<string, string>
}

type UseInfiniteScrollReturn<T> = {
  data: T[]
  isLoading: boolean
  hasMore: boolean
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

const getItemId = <T,>(item: T): string | number | null => {
  if (typeof item !== 'object' || item === null || !('id' in item)) {
    return null
  }

  const candidate = item.id
  return typeof candidate === 'string' || typeof candidate === 'number' ? candidate : null
}

const mergeUniqueItems = <T,>(existing: T[], incoming: T[]): T[] => {
  const seen = new Set<string>()
  const merged: T[] = []

  const append = (item: T) => {
    const itemId = getItemId(item)
    if (itemId === null) {
      merged.push(item)
      return
    }

    const key = String(itemId)
    if (seen.has(key)) return

    seen.add(key)
    merged.push(item)
  }

  existing.forEach(append)
  incoming.forEach(append)

  return merged
}

export const useInfiniteScroll = <T>({
  initialData,
  totalCount,
  pageSize,
  fetchUrl,
  filterParams,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> => {
  const [data, setData] = useState<T[]>(initialData)
  const [offset, setOffset] = useState(initialData.length)
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(totalCount)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const requestKeyRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  // 필터/초기 데이터 변경 시 리셋
  useEffect(() => {
    requestKeyRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
    setData(mergeUniqueItems([], initialData))
    setOffset(initialData.length)
    setTotal(totalCount)
  }, [initialData, totalCount])

  const hasMore = offset < total

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    const requestKey = requestKeyRef.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const params = new URLSearchParams({
        ...filterParams,
        offset: String(offset),
        limit: String(pageSize),
      })

      const res = await fetch(`${fetchUrl}?${params.toString()}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Fetch failed')

      const result = (await res.json()) as { data: T[]; totalCount: number }
      if (requestKeyRef.current !== requestKey) return
      setData((prev) => mergeUniqueItems(prev, result.data))
      setOffset((prev) => prev + result.data.length)
      setTotal(result.totalCount)
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return
      // 에러 시 다음 스크롤에서 재시도
    } finally {
      if (requestKeyRef.current === requestKey) {
        setIsLoading(false)
        if (abortRef.current === controller) abortRef.current = null
      }
    }
  }, [isLoading, hasMore, offset, pageSize, fetchUrl, filterParams])

  // Intersection Observer + 초기 뷰포트 내 sentinel 처리
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // sentinel이 처음부터 뷰포트 안에 있을 때 연속 로드
  useEffect(() => {
    if (isLoading || !hasMore) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    // 다음 렌더 사이클에서 체크 (중복 호출 방지)
    const timer = setTimeout(() => {
      const rect = sentinel.getBoundingClientRect()
      const inViewport = rect.top < window.innerHeight + 200
      if (inViewport) {
        loadMore()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [data.length, isLoading, hasMore]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, hasMore, sentinelRef }
}
