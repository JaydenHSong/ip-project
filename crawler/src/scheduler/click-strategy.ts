// Smart click target selection
// 순서대로 클릭하지 않고, 랜덤 셔플하여 자연스러운 쇼핑 패턴을 시뮬레이션

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
  const maxProducts = persona.navigation.productsToViewPerPage

  if (results.length === 0) return []

  // 전체를 원본 인덱스와 함께 셔플
  const shuffled = results
    .map((r, i) => ({ result: r, originalIndex: i }))
    .sort(() => Math.random() - 0.5)

  // 최대 productsToViewPerPage개 선택
  const selected = shuffled.slice(0, Math.min(maxProducts, shuffled.length))

  return selected.map(({ result, originalIndex }) => ({
    index: originalIndex,
    asin: result.asin,
    reason: 'suspect' as const,
  }))
}

export { selectClickTargets }
export type { ClickTarget }
