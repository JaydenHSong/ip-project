// Design Ref: ft-optimization-ui-wiring §2.1.1 — Skip All 서버 연동 재사용
// 3 consumers: bid-optimization (S04), keywords-management (S06), ai-recommendations (S11)

'use client'

import { useCallback, useState } from 'react'

export type SkipResult = {
  total: number
  succeeded: number
  failed: number
  failedIds: string[]
}

export function useSkipRecommendations(brandMarketId: string) {
  const [isRunning, setIsRunning] = useState(false)

  const skipAll = useCallback(async (ids: string[]): Promise<SkipResult> => {
    if (ids.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, failedIds: [] }
    }
    setIsRunning(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/ads/recommendations/${id}/skip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand_market_id: brandMarketId }),
          }).then((res) => {
            if (!res.ok) throw new Error(`${res.status}`)
          }),
        ),
      )
      const failedIds = results
        .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
        .filter((x): x is string => x !== null)
      return {
        total: ids.length,
        succeeded: ids.length - failedIds.length,
        failed: failedIds.length,
        failedIds,
      }
    } finally {
      setIsRunning(false)
    }
  }, [brandMarketId])

  return { skipAll, isRunning }
}
