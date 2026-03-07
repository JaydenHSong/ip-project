// 1차 스캔: 검색 결과 페이지에서 상세 진입 없이 의심 건 필터링
// ① 베리에이션 7개 이상 → V10 의심
// ② 제목 키워드 매칭 → V01, V06 등 의심
// ③ 썸네일 AI 비전 스캔 (Haiku) → V08 의심 (선택적)

import type { SearchResult, PreScanResult } from '../types/index.js'
import type { VisionAnalyzer } from './vision-analyzer.js'
import { log } from '../logger.js'

// Spigen 관련 키워드 (서버 src/constants/restricted-keywords.ts와 동기화)
const SUSPECT_KEYWORDS = {
  trademark_abuse: [
    'spigen', 'tough armor', 'rugged armor', 'ultra hybrid',
    'thin fit', 'liquid air', 'liquid crystal', 'neo hybrid',
    'crystal flex', 'ez fit', 'glas.tr', 'glastr', 'ciel', 'cyrill',
  ],
  compatibility_misleading: [
    'compatible with spigen', 'fits spigen', 'for spigen',
    'spigen compatible', 'works with spigen',
  ],
  counterfeit_signals: [
    'oem', 'original quality', 'same as', 'replica',
    'replacement for spigen', 'alternative to spigen',
  ],
} as const

const ALL_SUSPECT_KEYWORDS = Object.values(SUSPECT_KEYWORDS).flat()

const VARIATION_THRESHOLD = 7

// 키워드 + 베리에이션 기반 1차 스캔
const preScanResult = (result: SearchResult): PreScanResult => {
  // 자사(Spigen) 제품은 항상 non-suspect
  if (result.isSpigen) {
    return { isSuspect: false, suspectReasons: [], score: 0 }
  }

  const reasons: string[] = []
  let score = 0

  // ① 베리에이션 7개 이상 → V10 의심
  if (result.variationCount !== null && result.variationCount >= VARIATION_THRESHOLD) {
    reasons.push(`V10: ${result.variationCount} variations (>= ${VARIATION_THRESHOLD})`)
    score += 30
  }

  // ② 제목 키워드 매칭
  const titleLower = result.title.toLowerCase()
  const matched: string[] = []

  for (const keyword of ALL_SUSPECT_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      matched.push(keyword)
    }
  }

  if (matched.length > 0) {
    reasons.push(`Keyword match: ${matched.join(', ')}`)
    score += 20 * matched.length
  }

  return {
    isSuspect: reasons.length > 0,
    suspectReasons: reasons,
    score: Math.min(score, 100),
  }
}

// 배치 1차 스캔 (검색 결과 전체)
const preScanSearchResults = (results: SearchResult[]): SearchResult[] => {
  let suspectCount = 0

  for (const result of results) {
    const scan = preScanResult(result)
    result.preScanResult = scan
    if (scan.isSuspect) suspectCount++
  }

  log('info', 'pre-scanner', `Pre-scan: ${results.length} total, ${suspectCount} suspect`)
  return results
}

// 썸네일 AI 비전 스캔 (선택적, 비용 주의)
// 검색 결과 페이지 스크린샷 1장으로 20개를 한번에 분석
const thumbnailVisionScan = async (
  vision: VisionAnalyzer,
  screenshotBase64: string,
  results: SearchResult[],
): Promise<string[]> => {
  try {
    const aiResult = await vision.scanThumbnails(screenshotBase64)

    if (!aiResult.violations || aiResult.violations.length === 0) {
      log('info', 'pre-scanner', 'Thumbnail vision scan: no violations found')
      return []
    }

    const violatingAsins: string[] = []

    for (const v of aiResult.violations) {
      const match = results.find(r => r.asin === v.asin)
      if (match) {
        violatingAsins.push(v.asin)
        if (!match.preScanResult) {
          match.preScanResult = { isSuspect: false, suspectReasons: [], score: 0 }
        }
        match.preScanResult.isSuspect = true
        match.preScanResult.suspectReasons.push(`V08: ${v.reason}`)
        match.preScanResult.score = Math.min(match.preScanResult.score + 40, 100)
      }
    }

    log('info', 'pre-scanner', `Thumbnail vision scan: ${violatingAsins.length} violations`)
    return violatingAsins
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log('warn', 'pre-scanner', `Thumbnail vision scan failed: ${msg}`)
    return []
  }
}

export { preScanSearchResults, thumbnailVisionScan, preScanResult }
