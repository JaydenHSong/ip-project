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

  // 필터/초기 데이터 변경 시 리셋
  useEffect(() => {
    setData(initialData)
    setOffset(initialData.length)
    setTotal(totalCount)
  }, [initialData, totalCount])

  const hasMore = offset < total

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        ...filterParams,
        offset: String(offset),
        limit: String(pageSize),
      })

      const res = await fetch(`${fetchUrl}?${params.toString()}`)
      if (!res.ok) throw new Error('Fetch failed')

      const result = (await res.json()) as { data: T[]; totalCount: number }
      setData((prev) => [...prev, ...result.data])
      setOffset((prev) => prev + result.data.length)
      setTotal(result.totalCount)
    } catch {
      // 에러 시 다음 스크롤에서 재시도
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, offset, pageSize, fetchUrl, filterParams])

  // Intersection Observer
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

  return { data, isLoading, hasMore, sentinelRef }
}
