// Case ID Recovery — Monitor Phase 0
// BR 대시보드에서 Subject 매칭으로 누락된 case_id를 복구

import type { Page } from 'playwright'
import type { SentinelClient, CaseIdMissingReport } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const CASE_DASHBOARD_URL = 'https://brandregistry.amazon.com/gp/case-dashboard/lobby.html'

type DashboardCase = {
  caseId: string
  subject: string
  createdAt: string
}

// 대시보드에서 최근 케이스 목록 스크래핑
const scrapeDashboardCases = async (page: Page): Promise<DashboardCase[]> => {
  await page.goto(CASE_DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(3000)

  const cases = await page.evaluate(() => {
    const rows = document.querySelectorAll('table tbody tr')
    const results: { caseId: string; subject: string; createdAt: string }[] = []

    for (const row of Array.from(rows)) {
      const cells = row.querySelectorAll('td')
      if (cells.length < 4) continue

      const caseId = cells[0]?.textContent?.trim() ?? ''
      const subject = cells[2]?.textContent?.trim() ?? ''
      const createdAt = cells[3]?.textContent?.trim() ?? ''

      if (caseId && /^\d{5,}$/.test(caseId)) {
        results.push({ caseId, subject, createdAt })
      }
    }

    return results
  })

  return cases
}

// Subject에서 ASIN 추출: "... [B0FLTCWBN3]" → "B0FLTCWBN3"
const extractAsinFromSubject = (subject: string): string | null => {
  const match = subject.match(/\[([A-Z0-9]{10})\]/)
  return match ? match[1] : null
}

// 리포트와 케이스 매칭
const matchCaseToReport = (
  target: CaseIdMissingReport,
  availableCases: DashboardCase[],
): DashboardCase | null => {
  // 1순위: Subject 안의 ASIN으로 매칭 (새로 제출된 건)
  if (target.asin) {
    const asinMatch = availableCases.find((c) => {
      const asinInSubject = extractAsinFromSubject(c.subject)
      return asinInSubject === target.asin
    })
    if (asinMatch) return asinMatch
  }

  // 2순위: Subject === draft_title 매칭 (기존 건, ASIN suffix 없는 경우)
  if (target.draft_title) {
    const titleMatches = availableCases.filter((c) =>
      c.subject === target.draft_title || c.subject.startsWith(target.draft_title!)
    )

    if (titleMatches.length === 1) return titleMatches[0]

    // 동일 Subject 여러 건 → 제출 시간과 가장 가까운 것
    if (titleMatches.length > 1 && target.submitted_at) {
      const submittedTime = new Date(target.submitted_at).getTime()
      let closest = titleMatches[0]
      let closestDiff = Infinity

      for (const c of titleMatches) {
        const caseTime = new Date(c.createdAt).getTime()
        const diff = Math.abs(caseTime - submittedTime)
        if (diff < closestDiff) {
          closestDiff = diff
          closest = c
        }
      }
      return closest
    }
  }

  return null
}

// 메인: case_id 복구 실행
export const recoverMissingCaseIds = async (
  page: Page,
  sentinelClient: SentinelClient,
): Promise<number> => {
  // 1. 복구 대상 조회
  const targets = await sentinelClient.getCaseIdMissing()
  if (targets.length === 0) return 0

  log('info', 'case-id-recovery', `Found ${targets.length} reports missing case_id`)

  // 2. 대시보드에서 케이스 목록 스크래핑
  let cases: DashboardCase[]
  try {
    cases = await scrapeDashboardCases(page)
    log('info', 'case-id-recovery', `Scraped ${cases.length} cases from dashboard`)
  } catch (error) {
    log('warn', 'case-id-recovery', `Dashboard scrape failed: ${error instanceof Error ? error.message : String(error)}`)
    return 0 // 대시보드 실패 시 retry_count 안 올림, 다음 사이클에서 재시도
  }

  if (cases.length === 0) return 0

  // 3. 이미 매칭된 case_id 제외 (DB에서 가져오기 어려우므로, 이번 세션에서 매칭한 것만 추적)
  const matchedCaseIds = new Set<string>()
  let recovered = 0

  // 4. 각 타겟에 대해 매칭 시도
  for (const target of targets) {
    const available = cases.filter((c) => !matchedCaseIds.has(c.caseId))
    const matched = matchCaseToReport(target, available)

    if (matched) {
      matchedCaseIds.add(matched.caseId)
      log('info', 'case-id-recovery', `Recovered case_id ${matched.caseId} for report ${target.report_id} (subject: "${matched.subject}")`)
      recovered++
    } else {
      log('warn', 'case-id-recovery', `No match found for report ${target.report_id} (title: "${target.draft_title}") — retry ${target.retry_count + 1}/3`)
    }

    // 결과 보고 (성공/실패 모두)
    try {
      await sentinelClient.reportCaseIdRecovery({
        report_id: target.report_id,
        br_case_id: matched?.caseId ?? null,
      })
    } catch (error) {
      log('error', 'case-id-recovery', `Failed to report recovery: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  log('info', 'case-id-recovery', `Recovery complete: ${recovered}/${targets.length} recovered`)
  return recovered
}
