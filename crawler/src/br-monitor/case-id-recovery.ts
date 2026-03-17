// Case ID Recovery — Monitor Phase 0
// BR 대시보드에서 Subject/ASIN 매칭으로 누락된 case_id를 복구

import type { Page } from 'playwright'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const CASE_DASHBOARD_URL = 'https://brandregistry.amazon.com/gp/case-dashboard/lobby.html'

type CaseIdMissingResponse = {
  reports: Array<{
    report_id: string
    draft_title: string | null
    asin: string | null
    submitted_at: string | null
    retry_count: number
  }>
  used_case_ids: string[]
}

type DashboardCase = {
  caseId: string
  subject: string
  createdAt: string
}

// Bug2 fix: 대시보드에서 Results per page를 50으로 변경 후 스크래핑
const scrapeDashboardCases = async (page: Page): Promise<DashboardCase[]> => {
  await page.goto(CASE_DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(3000)

  // Results per page 드롭다운을 50으로 변경 시도
  try {
    const dropdown = page.locator('select').filter({ hasText: '10' }).first()
    if (await dropdown.isVisible({ timeout: 3000 })) {
      await dropdown.selectOption('50')
      await page.waitForTimeout(3000)
    }
  } catch {
    // 드롭다운 못 찾으면 기본 10건으로 진행
    log('warn', 'case-id-recovery', 'Could not change results per page, using default')
  }

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

// Bug5 fix: 대시보드 날짜 안전 파싱 ("Mar 16, 2026, 05:38 PM PDT" → timestamp)
const parseDashboardDate = (dateStr: string): number => {
  // 타임존 약자 제거 (PDT, PST 등 — JS Date가 못 파싱)
  const cleaned = dateStr.replace(/\s+(PDT|PST|EDT|EST|CDT|CST|MDT|MST|UTC|GMT)\s*$/i, '')
  const ts = new Date(cleaned).getTime()
  return isNaN(ts) ? 0 : ts
}

// 리포트와 케이스 매칭
const matchCaseToReport = (
  target: CaseIdMissingResponse['reports'][0],
  availableCases: DashboardCase[],
): DashboardCase | null => {
  // 1순위: Subject 안의 ASIN으로 매칭 (ASIN suffix가 있는 신규 건)
  if (target.asin) {
    const asinMatch = availableCases.find((c) => {
      const asinInSubject = extractAsinFromSubject(c.subject)
      return asinInSubject === target.asin
    })
    if (asinMatch) return asinMatch

    // Subject에 ASIN 텍스트가 포함된 경우도 체크 (suffix 없이 관리자가 넣은 경우)
    const asinTextMatch = availableCases.find((c) =>
      target.asin && c.subject.includes(target.asin)
    )
    if (asinTextMatch) return asinTextMatch
  }

  // 2순위: Subject === draft_title 매칭
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
        const caseTime = parseDashboardDate(c.createdAt)
        if (caseTime === 0) continue
        const diff = Math.abs(caseTime - submittedTime)
        if (diff < closestDiff) {
          closestDiff = diff
          closest = c
        }
      }
      return closest
    }
  }

  // 3순위: 시간 기반 매칭 (Subject 다를 수 있음, ±30분 이내 가장 가까운 미매칭 건)
  if (target.submitted_at) {
    const submittedTime = new Date(target.submitted_at).getTime()
    const TIME_WINDOW = 30 * 60 * 1000 // 30분

    let closest: DashboardCase | null = null
    let closestDiff = Infinity

    for (const c of availableCases) {
      const caseTime = parseDashboardDate(c.createdAt)
      if (caseTime === 0) continue
      const diff = Math.abs(caseTime - submittedTime)
      if (diff <= TIME_WINDOW && diff < closestDiff) {
        closestDiff = diff
        closest = c
      }
    }

    if (closest) return closest
  }

  return null
}

// 메인: case_id 복구 실행
export const recoverMissingCaseIds = async (
  page: Page,
  sentinelClient: SentinelClient,
): Promise<number> => {
  // 1. 복구 대상 조회 (raw fetch — getCaseIdMissing은 used_case_ids 미포함)
  let response: CaseIdMissingResponse
  try {
    const raw = await sentinelClient.getCaseIdMissing()
    response = raw as unknown as CaseIdMissingResponse
  } catch {
    return 0
  }

  const targets = response.reports ?? (response as unknown as Array<unknown>)
  if (!Array.isArray(targets) || targets.length === 0) return 0

  log('info', 'case-id-recovery', `Found ${targets.length} reports missing case_id`)

  // 2. 대시보드에서 케이스 목록 스크래핑
  let cases: DashboardCase[]
  try {
    cases = await scrapeDashboardCases(page)
    log('info', 'case-id-recovery', `Scraped ${cases.length} cases from dashboard`)
  } catch (error) {
    log('warn', 'case-id-recovery', `Dashboard scrape failed: ${error instanceof Error ? error.message : String(error)}`)
    return 0 // 대시보드 실패 시 retry_count 안 올림
  }

  if (cases.length === 0) return 0

  // Bug4 fix: DB에 이미 매칭된 case_id + 이번 세션에서 매칭한 것 모두 제외
  const usedCaseIds = new Set<string>(response.used_case_ids ?? [])
  let recovered = 0

  // 4. 각 타겟에 대해 매칭 시도
  const reportTargets = targets as CaseIdMissingResponse['reports']
  for (const target of reportTargets) {
    const available = cases.filter((c) => !usedCaseIds.has(c.caseId))
    const matched = matchCaseToReport(target, available)

    if (matched) {
      usedCaseIds.add(matched.caseId)
      log('info', 'case-id-recovery', `Recovered case_id ${matched.caseId} for report ${target.report_id} (subject: "${matched.subject}")`)
      recovered++
    } else {
      log('warn', 'case-id-recovery', `No match found for report ${target.report_id} (title: "${target.draft_title}", asin: ${target.asin}) — retry ${target.retry_count + 1}/3`)
    }

    // 결과 보고
    try {
      await sentinelClient.reportCaseIdRecovery({
        report_id: target.report_id,
        br_case_id: matched?.caseId ?? null,
      })
    } catch (error) {
      log('error', 'case-id-recovery', `Failed to report recovery: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  log('info', 'case-id-recovery', `Recovery complete: ${recovered}/${reportTargets.length} recovered`)
  return recovered
}
