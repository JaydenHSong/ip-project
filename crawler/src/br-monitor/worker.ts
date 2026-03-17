// BR Monitor Worker — BR Case Dashboard 자동 스크래핑 (Playwright)
// Browser 3: /tmp/br-monitor-data/ (독립 세션)
import { chromium, type BrowserContext, type Page } from 'playwright'
import type { Job } from 'bullmq'
import type {
  BrMonitorJobData,
  BrMonitorTarget,
  BrMonitorResult,
  ScrapedMessage,
  CaseDetailScraped,
} from './types.js'
import { log } from '../logger.js'
import { validateMessages, detectCycleAnomaly } from './validate.js'
import { recoverMissingCaseIds } from './case-id-recovery.js'

const CASE_DETAIL_URL = 'https://brandregistry.amazon.com/cu/case-dashboard/view-case'
const USER_DATA_DIR = process.env['BR_MONITOR_DATA_DIR'] || '/tmp/br-monitor-data'
const CASE_DELAY_MS = 5_000 // 케이스 간 딜레이 (anti-bot)
const PAGE_LOAD_TIMEOUT = 30_000

// ─── DOM Selectors (클래스명 기반) ────────────────────────────
const SELECTORS = {
  sender: 'div.m8v2kxruDtg3OA3mwzEj',
  email: 'div.q8_q8rkh9qNTsGWfOAbD',
  dateContainer: 'div.nzO_8eJLQRkq5RdzrqNn',
  messageContainer: 'div.gvsF1mi5Rw4CeOQSjINM',
  messageHeader: 'div.IJgI1Q0k2QtdW4J3onhO',
  senderContainer: 'div.P7wGTaW4ghGkEYr8Absw',
}

// ─── Case Summary regex patterns ────────────────────────────
const SUMMARY_PATTERNS = {
  id: /ID:\s*(\d+)/,
  status: /Status:\s*(.+?)(?:\n|Support)/,
  created: /Created:\s*(.+?)(?:\n|$)/,
}

// ─── Persistent Browser Session (Browser 3) ─────────────────
let browserContext: BrowserContext | null = null
let browserPage: Page | null = null

const ensureMonitorBrowser = async (): Promise<{ context: BrowserContext; page: Page }> => {
  if (browserContext && browserPage) {
    try {
      await browserPage.title()
      return { context: browserContext, page: browserPage }
    } catch {
      log('warn', 'br-monitor', 'Page closed, recreating...')
    }
  }

  browserContext = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: process.env['BR_MONITOR_HEADLESS'] !== 'false',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  browserPage = browserContext.pages()[0] || await browserContext.newPage()
  log('info', 'br-monitor', 'Monitor browser launched with persistent context')

  return { context: browserContext, page: browserPage }
}

// ─── Login Check ─────────────────────────────────────────────
const ensureLoggedIn = async (page: Page): Promise<boolean> => {
  const url = page.url()

  // 이미 BR 페이지에 있고 로그인 됨
  if (url.includes('brandregistry.amazon.com') && !url.includes('/ap/') && !url.includes('signin')) {
    return true
  }

  // BR 케이스 대시보드로 이동 시도
  await page.goto(`${CASE_DETAIL_URL}?caseID=test`, {
    waitUntil: 'networkidle',
    timeout: PAGE_LOAD_TIMEOUT,
  }).catch(() => {})

  // 로그인 페이지로 리다이렉트됨 = 세션 만료 → 자동 로그인 시도
  if (page.url().includes('signin') || page.url().includes('/ap/')) {
    log('warn', 'br-monitor', 'Session expired — attempting auto-login')

    const email = process.env['BR_EMAIL']
    const password = process.env['BR_PASSWORD']

    if (!email || !password) {
      log('warn', 'br-monitor', 'BR_EMAIL/BR_PASSWORD not set — skipping this cycle')
      return false
    }

    try {
      await page.fill('#ap_email', email, { timeout: 10_000 }).catch(() => {})
      await page.click('#continue').catch(() => {})
      await page.fill('#ap_password', password, { timeout: 10_000 }).catch(() => {})
      await page.click('#signInSubmit').catch(() => {})

      // OTP 처리
      const otpInput = await page.waitForSelector('#auth-mfa-otpcode', { timeout: 5_000 }).catch(() => null)
      if (otpInput) {
        const secret = process.env['BR_OTP_SECRET']
        if (secret) {
          const { TOTP } = await import('otpauth')
          const totp = new TOTP({ secret, digits: 6, period: 30 })
          await otpInput.fill(totp.generate())
          await page.click('#auth-signin-button').catch(() => {})
        } else {
          log('warn', 'br-monitor', 'OTP required but BR_OTP_SECRET not set — skipping')
          return false
        }
      }

      await page.waitForURL(
        (u) => u.toString().includes('brandregistry.amazon.com') && !u.toString().includes('/ap/'),
        { timeout: 30_000 },
      )
      log('info', 'br-monitor', 'BR login successful (auto)')
      return true
    } catch (err) {
      log('warn', 'br-monitor', `Auto-login failed: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }

  return true
}

// ─── Case Detail Scraping ────────────────────────────────────
const scrapeCaseDetail = async (page: Page, caseId: string): Promise<CaseDetailScraped | null> => {
  const url = `${CASE_DETAIL_URL}?caseID=${caseId}`
  log('info', 'br-monitor', `Scraping case detail: ${caseId}`)

  await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_LOAD_TIMEOUT })

  // 로그인 페이지 감지 — 세션 만료 시 스크래핑 방지
  const currentUrl = page.url()
  if (currentUrl.includes('signin') || currentUrl.includes('/ap/')) {
    log('warn', 'br-monitor', `Case ${caseId}: redirected to login page, skipping`)
    return null
  }

  // 404 or case not found
  const pageText = await page.textContent('body').catch(() => '') ?? ''
  if (pageText.includes('not found') || pageText.includes('404') || pageText.includes('does not exist')) {
    log('warn', 'br-monitor', `Case ${caseId} not found (possibly closed/deleted)`)
    return { caseId, status: 'closed', messages: [] }
  }

  // Case Summary에서 상태 추출
  const status = await extractCaseStatus(page, pageText)

  // 메시지 추출
  const messages = await extractMessages(page)

  return { caseId, status, messages }
}

// ─── Case Status Extraction ─────────────────────────────────
const extractCaseStatus = async (page: Page, bodyText: string): Promise<string> => {
  // Method 1: regex on page text
  const statusMatch = bodyText.match(SUMMARY_PATTERNS.status)
  if (statusMatch) {
    return normalizeStatus(statusMatch[1].trim())
  }

  // Method 2: evaluate in page for more precise extraction
  const status = await page.evaluate(() => {
    // 텍스트 기반 fallback: "Status:" 레이블 뒤의 값
    const allText = document.body?.textContent || ''
    const match = allText.match(/Status:\s*(.+?)(?:\n|Support|Created)/)
    return match ? match[1].trim() : null
  }).catch(() => null)

  if (status) return normalizeStatus(status)

  return 'open' // 기본값
}

// ─── Normalize BR Status ─────────────────────────────────────
const normalizeStatus = (raw: string): string => {
  const lower = raw.toLowerCase().trim()

  if (lower.includes('answered')) return 'answered'
  if (lower.includes('needs') || lower.includes('attention') || lower.includes('action')) return 'needs_attention'
  if (lower.includes('work in progress') || lower.includes('progress')) return 'work_in_progress'
  if (lower.includes('closed') || lower.includes('resolved')) return 'closed'
  if (lower.includes('open')) return 'open'

  return 'open'
}

// ─── Message Extraction ──────────────────────────────────────
const extractMessages = async (page: Page): Promise<ScrapedMessage[]> => {
  // Method 1: kat-box 기반 — 각 메시지 카드에서 header(sender+date) + body 추출
  const messages = await page.evaluate((selectors) => {
    const results: Array<{
      direction: 'inbound' | 'outbound'
      sender: string
      body: string
      sentAt: string
    }> = []

    // 각 메시지 헤더를 기준으로 같은 카드 내 body를 찾음
    const headerEls = document.querySelectorAll(selectors.messageHeader)

    for (let i = 0; i < headerEls.length; i++) {
      const header = headerEls[i]
      // 같은 부모(kat-box) 안에서 body div 찾기
      const parent = header.parentElement
      if (!parent) continue

      const senderEl = header.querySelector(selectors.sender.replace('div.', '.'))
      const dateEl = header.querySelector(selectors.dateContainer.replace('div.', '.'))
      const bodyEl = parent.querySelector(selectors.messageContainer.replace('div.', '.'))

      const senderText = senderEl?.textContent?.trim() || ''
      // date 컨테이너에 자식 div가 2개 (날짜 + 시간) → 공백으로 합치기
      const dateChildren = dateEl?.querySelectorAll('div')
      const dateText = dateChildren && dateChildren.length > 1
        ? Array.from(dateChildren).map((d) => d.textContent?.trim()).join(' ')
        : dateEl?.textContent?.trim() || ''
      const bodyText = bodyEl?.textContent?.trim() || ''

      if (!bodyText) continue

      const isAmazon = senderText.toLowerCase().includes('amazon')
      const direction = isAmazon ? 'inbound' as const : 'outbound' as const
      const sender = isAmazon ? 'Amazon' : senderText

      // 날짜 파싱: "Mar 06, 2026 4:35 PM PST" 또는 "Mar 13, 2026" + "7:54 PM UTC"
      let sentAt = ''
      if (dateText) {
        try {
          const cleaned = dateText.replace(/\s*(PST|PDT|EST|EDT|CST|CDT|MST|MDT|UTC)$/i, '').trim()
          const parsed = new Date(cleaned)
          if (!isNaN(parsed.getTime())) {
            sentAt = parsed.toISOString()
          } else {
            sentAt = new Date().toISOString()
          }
        } catch {
          sentAt = new Date().toISOString()
        }
      }

      results.push({ direction, sender, body: bodyText, sentAt })
    }

    return results
  }, SELECTORS).catch(() => [] as ScrapedMessage[])

  if (messages.length > 0) return messages

  // Method 2: 텍스트 기반 fallback
  return extractMessagesFallback(page)
}

// ─── Fallback Message Extraction (텍스트 기반) ───────────────
const extractMessagesFallback = async (page: Page): Promise<ScrapedMessage[]> => {
  return page.evaluate(() => {
    const results: Array<{
      direction: 'inbound' | 'outbound'
      sender: string
      body: string
      sentAt: string
    }> = []

    // 모든 div를 순회하며 "Amazon" 또는 "You" 발신자 패턴 찾기
    const allDivs = document.querySelectorAll('div')
    let currentSender = ''
    let currentDate = ''

    for (const div of Array.from(allDivs)) {
      const text = div.textContent?.trim() || ''

      // 발신자 패턴 감지
      if (text === 'Amazon' || text === 'You' || text.match(/^[\w.]+@[\w.]+$/)) {
        currentSender = text
        continue
      }

      // 날짜 패턴 감지 (Mar 06, 2026 형태)
      if (text.match(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}/)) {
        currentDate = text
        continue
      }

      // 충분히 긴 텍스트 = 메시지 본문으로 추정
      if (currentSender && text.length > 20) {
        const isAmazon = currentSender.toLowerCase().includes('amazon')

        let sentAt = ''
        try {
          const parsed = new Date(currentDate.replace(/\s*(PST|PDT|EST|EDT|CST|CDT|MST|MDT|UTC)$/i, '').trim())
          sentAt = !isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString()
        } catch {
          sentAt = new Date().toISOString()
        }

        results.push({
          direction: isAmazon ? 'inbound' : 'outbound',
          sender: isAmazon ? 'Amazon' : currentSender,
          body: text,
          sentAt,
        })

        currentSender = ''
      }
    }

    return results
  }).catch(() => [])
}

// ─── Detect New Messages ─────────────────────────────────────
const detectNewMessages = (
  scraped: ScrapedMessage[],
  lastScrapedAt: string | null,
): ScrapedMessage[] => {
  if (!lastScrapedAt) return scraped // 첫 스크래핑 — 전체 반환

  const lastTime = new Date(lastScrapedAt).getTime()

  return scraped.filter((msg) => {
    const msgTime = new Date(msg.sentAt).getTime()
    return msgTime > lastTime
  })
}

// ─── Delay Helper ────────────────────────────────────────────
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Random Delay (anti-bot) ─────────────────────────────────
const randomDelay = (minMs: number, maxMs: number): Promise<void> => {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return delay(ms)
}

// ─── Notification callback type ──────────────────────────────
type NotifyFn = (message: string) => Promise<void>

let notifyOperator: NotifyFn = async () => {}

const setMonitorNotifier = (fn: NotifyFn): void => {
  notifyOperator = fn
}

// ─── Main Job Processor ──────────────────────────────────────
const processBrMonitorJob = async (
  job: Job<BrMonitorJobData>,
  reportResult: (result: BrMonitorResult) => Promise<void>,
  verifyReportExists?: (id: string) => Promise<boolean>,
  sentinelClient?: { getCaseIdMissing: () => Promise<unknown[]>; reportCaseIdRecovery: (data: { report_id: string; br_case_id: string | null }) => Promise<void> },
): Promise<void> => {
  const { reports } = job.data

  if (reports.length === 0) {
    log('info', 'br-monitor', 'No pending monitors — skipping')
    return
  }

  log('info', 'br-monitor', `Processing ${reports.length} BR monitor targets`)

  const { page } = await ensureMonitorBrowser()

  // 로그인 확인
  const loggedIn = await ensureLoggedIn(page)
  if (!loggedIn) {
    log('warn', 'br-monitor', 'Not logged in — skipping entire cycle')
    await notifyOperator('⚠️ *[BR Monitor]* 세션 만료 — BR Case Dashboard 로그인이 필요합니다.')
    return
  }

  // Phase 0: Case ID 복구 (case_id가 null인 리포트)
  if (sentinelClient) {
    try {
      const recovered = await recoverMissingCaseIds(page, sentinelClient as Parameters<typeof recoverMissingCaseIds>[1])
      if (recovered > 0) {
        log('info', 'br-monitor', `Phase 0: Recovered ${recovered} missing case IDs`)
      }
    } catch (error) {
      log('warn', 'br-monitor', `Phase 0 case ID recovery error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  let processed = 0
  let skipped = 0
  let casesWithNewMessages = 0
  let totalNewMessages = 0
  let totalRejected = 0
  let reLoginCount = 0
  let abortedAt: string | null = null

  for (const target of reports) {
    try {
      // 삭제된 리포트 스킵
      if (verifyReportExists) {
        const exists = await verifyReportExists(target.reportId)
        if (!exists) {
          log('warn', 'br-monitor', `Report ${target.reportId} no longer exists, skipping case ${target.brCaseId}`)
          skipped++
          continue
        }
      }

      const caseResult = await processSingleCase(page, target, reportResult)

      // 자가 복구: processSingleCase가 null 반환 = 로그인 만료 감지
      if (!caseResult) {
        log('warn', 'br-monitor', `Session expired mid-cycle at case ${target.brCaseId}, attempting re-login`)
        reLoginCount++
        const reLoggedIn = await ensureLoggedIn(page)
        if (reLoggedIn) {
          log('info', 'br-monitor', 'Re-login successful, retrying case')
          const retryResult = await processSingleCase(page, target, reportResult)
          if (retryResult) {
            processed++
            if (retryResult.newMessageCount > 0) casesWithNewMessages++
            totalNewMessages += retryResult.newMessageCount
            totalRejected += retryResult.rejectedCount
            continue
          }
        }
        // 재로그인 실패 → 남은 케이스 전부 스킵
        log('error', 'br-monitor', 'Re-login failed, aborting remaining cases')
        abortedAt = target.brCaseId
        break
      }

      processed++
      if (caseResult.newMessageCount > 0) casesWithNewMessages++
      totalNewMessages += caseResult.newMessageCount
      totalRejected += caseResult.rejectedCount
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log('error', 'br-monitor', `Failed to process case ${target.brCaseId}: ${errorMsg}`)
      skipped++
    }

    // 케이스 간 랜덤 딜레이 (5~10초)
    if (reports.indexOf(target) < reports.length - 1) {
      await randomDelay(CASE_DELAY_MS, CASE_DELAY_MS * 2)
    }
  }

  log('info', 'br-monitor', `Monitor cycle complete: processed=${processed}, skipped=${skipped}`)

  // Layer 2: 사이클 이상 감지
  const anomaly = detectCycleAnomaly({
    totalCases: processed,
    casesWithNewMessages,
    totalNewMessages,
    rejectedMessages: totalRejected,
  })

  // 종합 리포트 — 문제가 있었을 때만 알림 (한 번만)
  const issues: string[] = []
  if (reLoginCount > 0) issues.push(`🔄 세션 만료 ${reLoginCount}회 → 자동 재로그인${abortedAt ? ' (실패, 중단됨)' : ' 성공'}`)
  if (totalRejected > 0) issues.push(`🚫 메시지 ${totalRejected}건 검증 거부 (로그인 페이지/HTML/잘못된 sender)`)
  if (anomaly.anomalyDetected) issues.push(`⚠️ 이상 패턴: ${anomaly.reason}`)
  if (abortedAt) issues.push(`❌ 케이스 ${abortedAt}에서 중단`)

  if (issues.length > 0) {
    const report = [
      '🛡️ *[BR Monitor]* 사이클 리포트',
      `처리: ${processed}/${reports.length} | 새 메시지: ${totalNewMessages}건`,
      '',
      ...issues,
    ].join('\n')
    await notifyOperator(report)
  }
}

// ─── Process Single Case ─────────────────────────────────────
type CaseProcessResult = { newMessageCount: number; rejectedCount: number }

const processSingleCase = async (
  page: Page,
  target: BrMonitorTarget,
  reportResult: (result: BrMonitorResult) => Promise<void>,
): Promise<CaseProcessResult | null> => {
  const detail = await scrapeCaseDetail(page, target.brCaseId)

  // null = 로그인 리다이렉트 또는 페이지 로드 실패 → 상위에서 재로그인 시도
  if (!detail) {
    // 로그인 페이지인지 확인
    const currentUrl = page.url()
    if (currentUrl.includes('signin') || currentUrl.includes('/ap/')) {
      return null // 상위에서 재로그인 + 재시도
    }
    log('warn', 'br-monitor', `No data for case ${target.brCaseId}`)
    return { newMessageCount: 0, rejectedCount: 0 }
  }

  // Layer 1: 메시지 검증
  const { accepted, rejected } = validateMessages(detail.messages)

  // 새 메시지 필터 (검증 통과한 것만)
  const newMessages = detectNewMessages(accepted, target.lastScrapedAt)

  // 상태 변경 감지
  const statusChanged = target.brCaseStatus !== detail.status

  // 변경 없으면 스킵
  if (newMessages.length === 0 && !statusChanged) {
    log('info', 'br-monitor', `Case ${target.brCaseId}: no changes`)
    return { newMessageCount: 0, rejectedCount: rejected.length }
  }

  // 아마존 마지막 답장 시간
  const amazonMessages = newMessages.filter((m) => m.direction === 'inbound')
  const lastAmazonReplyAt = amazonMessages.length > 0
    ? amazonMessages[amazonMessages.length - 1].sentAt
    : null

  if (statusChanged) {
    log('info', 'br-monitor', `Case ${target.brCaseId}: status changed ${target.brCaseStatus} → ${detail.status}`)
  }
  if (newMessages.length > 0) {
    log('info', 'br-monitor', `Case ${target.brCaseId}: ${newMessages.length} new messages`)
  }

  // 결과 보고
  const result: BrMonitorResult = {
    reportId: target.reportId,
    brCaseId: target.brCaseId,
    brCaseStatus: detail.status,
    newMessages,
    lastAmazonReplyAt,
  }

  await reportResult(result)
  return { newMessageCount: newMessages.length, rejectedCount: rejected.length }
}

// ─── Browser Cleanup ─────────────────────────────────────────
const closeMonitorBrowser = async (): Promise<void> => {
  if (browserContext) {
    await browserContext.close().catch(() => {})
    browserContext = null
    browserPage = null
    log('info', 'br-monitor', 'Monitor browser closed')
  }
}

export { processBrMonitorJob, closeMonitorBrowser, setMonitorNotifier, ensureMonitorBrowser, ensureLoggedIn }
