// Smart click target selection — V2
// 1차 스캔 결과 기반: suspect만 상세 진입
// 봇 탐지 방지를 위해 innocent 1~2개를 섞어 자연스러운 패턴 유지

import type { SearchResult } from '../types/index.js'
import type { CrawlPersona } from '../anti-bot/persona.js'

type ClickTarget = {
  index: number
  asin: string
  reason: 'suspect' | 'innocent'
}

const selectClickTargets = (
  results: SearchResult[],
  persona: CrawlPersona,
): ClickTarget[] => {
  if (results.length === 0) return []

  // suspect와 innocent 분리
  const suspects: { result: SearchResult; index: number }[] = []
  const innocents: { result: SearchResult; index: number }[] = []

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!
    if (r.preScanResult?.isSuspect) {
      suspects.push({ result: r, index: i })
    } else {
      innocents.push({ result: r, index: i })
    }
  }

  // suspect가 없으면 빈 배열 (상세 진입 안 함)
  if (suspects.length === 0) return []

  const targets: ClickTarget[] = []

  // 모든 suspect 추가
  for (const s of suspects) {
    targets.push({ index: s.index, asin: s.result.asin, reason: 'suspect' })
  }

  // 봇 탐지 방지: innocent 1~2개를 랜덤으로 섞음
  const innocentCount = Math.min(
    Math.floor(Math.random() * 2) + 1,
    innocents.length,
  )
  const shuffledInnocents = innocents.sort(() => Math.random() - 0.5)
  for (let i = 0; i < innocentCount; i++) {
    const inn = shuffledInnocents[i]!
    targets.push({ index: inn.index, asin: inn.result.asin, reason: 'innocent' })
  }

  // 전체를 셔플하여 자연스러운 클릭 순서
  targets.sort(() => Math.random() - 0.5)

  // maxProducts 제한 적용
  const maxProducts = persona.navigation.productsToViewPerPage
  return targets.slice(0, Math.min(maxProducts, targets.length))
}

export { selectClickTargets }
export type { ClickTarget }
