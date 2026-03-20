// Smart click target selection — V3
// 1차 스캔 결과 기반: suspect와 innocent를 분리 반환
// suspect → 상세 진입 + 스크린샷 (증거 수집)
// innocent → 이미지 차단 상태로 가볍게 방문 (봇 탐지 방지)

import type { SearchResult } from '../types/index.js'
import type { CrawlPersona } from '../anti-bot/persona.js'

type ClickTarget = {
  index: number
  asin: string
  reason: 'suspect' | 'innocent'
}

type ClickTargets = {
  suspects: ClickTarget[]
  innocents: ClickTarget[]
}

const selectClickTargets = (
  results: SearchResult[],
  _persona: CrawlPersona,
): ClickTargets => {
  if (results.length === 0) return { suspects: [], innocents: [] }

  // suspect와 innocent 분리
  const suspectItems: { result: SearchResult; index: number }[] = []
  const innocentItems: { result: SearchResult; index: number }[] = []

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    if (r.preScanResult?.isSuspect) {
      suspectItems.push({ result: r, index: i })
    } else {
      innocentItems.push({ result: r, index: i })
    }
  }

  const suspects: ClickTarget[] = suspectItems.map(s => ({
    index: s.index,
    asin: s.result.asin,
    reason: 'suspect' as const,
  }))

  // 봇 탐지 방지: suspect가 있을 때만 innocent 1~2개를 디코이로 추가
  const innocents: ClickTarget[] = []
  if (suspectItems.length > 0 && innocentItems.length > 0) {
    const innocentCount = Math.min(
      Math.floor(Math.random() * 2) + 1,
      innocentItems.length,
    )
    const shuffled = innocentItems.sort(() => Math.random() - 0.5)
    for (let i = 0; i < innocentCount; i++) {
      const inn = shuffled[i]!
      innocents.push({ index: inn.index, asin: inn.result.asin, reason: 'innocent' as const })
    }
  }

  return { suspects, innocents }
}

export { selectClickTargets }
export type { ClickTarget, ClickTargets }
