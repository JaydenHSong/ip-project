// BR Reply Worker — BR Case에 답장 자동 발송 (Browser 3 공유)
// br-monitor와 동일한 persistent context (/tmp/br-monitor-data/) 사용
import type { Page } from 'playwright'
import type { Job } from 'bullmq'
import type { BrReplyJobData, BrReplyResult, BrReplyAttachment } from './types.js'
import { log } from '../logger.js'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const CASE_DETAIL_URL = 'https://brandregistry.amazon.com/cu/case-dashboard/view-case'
const PAGE_LOAD_TIMEOUT = 30_000
const TMP_DIR = '/tmp/br-reply-files'

// ─── Delay Helper ────────────────────────────────────────
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const randomDelay = (minMs: number, maxMs: number): Promise<void> => {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs))
  return delay(ms)
}

// ─── Browser accessor (br-monitor에서 공유) ──────────────
// index.ts에서 주입
type GetBrowserPage = () => Promise<{ page: Page; ensureLoggedIn: (page: Page) => Promise<boolean> }>
let getBrowserPage: GetBrowserPage | null = null

const setBrowserPageAccessor = (accessor: GetBrowserPage): void => {
  getBrowserPage = accessor
}

// ─── Case Detail 페이지 이동 ─────────────────────────────
const openCaseDetail = async (page: Page, caseId: string): Promise<void> => {
  const url = `${CASE_DETAIL_URL}?caseID=${caseId}`
  log('info', 'br-reply', `Navigating to case: ${caseId}`)
  await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_LOAD_TIMEOUT })

  // 404 or not found
  const pageText = await page.textContent('body').catch(() => '') ?? ''
  if (pageText.includes('not found') || pageText.includes('404')) {
    throw new Error(`Case ${caseId} not found`)
  }
}

// ─── Reply 버튼 클릭 ─────────────────────────────────────
const clickReplyButton = async (page: Page): Promise<void> => {
  // Reply 버튼 찾기 — kat-button
  const clicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('kat-button')
    for (const btn of Array.from(buttons)) {
      const label = btn.getAttribute('label') || btn.textContent || ''
      if (label.toLowerCase().includes('reply')) {
        const shadow = btn.shadowRoot
        if (shadow) {
          const inner = shadow.querySelector('button')
          if (inner) { inner.click(); return true }
        }
        ;(btn as HTMLElement).click()
        return true
      }
    }
    return false
  })

  if (!clicked) throw new Error('Reply button not found')
  await delay(2000) // Reply 폼이 렌더링될 때까지 대기
}

// ─── Reply 텍스트 입력 (KAT Shadow DOM) ──────────────────
const fillReplyText = async (page: Page, text: string): Promise<void> => {
  const filled = await page.evaluate((val) => {
    // kat-textarea 찾기
    const textareas = document.querySelectorAll('kat-textarea')
    for (const ta of Array.from(textareas)) {
      const shadow = ta.shadowRoot
      if (!shadow) continue

      const inner = shadow.querySelector('textarea')
      if (!inner) continue

      // nativeInputValueSetter 사용
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      if (setter) {
        setter.call(inner, val)
      } else {
        inner.value = val
      }
      inner.dispatchEvent(new Event('input', { bubbles: true }))
      inner.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
    return false
  }, text)

  if (!filled) throw new Error('Reply textarea not found')
  log('info', 'br-reply', `Filled reply text (${text.length} chars)`)
}

// ─── 파일 첨부 ───────────────────────────────────────────
const attachFiles = async (
  page: Page,
  attachments: BrReplyAttachment[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<void> => {
  if (attachments.length === 0) return

  // BR 제한: 6파일, 10MB 합계
  const maxFiles = 6
  const filesToAttach = attachments.slice(0, maxFiles)

  await mkdir(TMP_DIR, { recursive: true })
  const tmpPaths: string[] = []

  try {
    // Supabase Storage에서 다운로드
    for (const att of filesToAttach) {
      const url = `${supabaseUrl}/storage/v1/object/${att.storage_path}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${supabaseKey}` },
      })

      if (!res.ok) {
        log('warn', 'br-reply', `Failed to download attachment: ${att.name} (${res.status})`)
        continue
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      const tmpPath = join(TMP_DIR, att.name)
      await writeFile(tmpPath, buffer)
      tmpPaths.push(tmpPath)
    }

    if (tmpPaths.length === 0) return

    // input[type="file"]에 setInputFiles
    const fileInput = await page.$('input[type="file"]')
    if (fileInput) {
      await fileInput.setInputFiles(tmpPaths)
      log('info', 'br-reply', `Attached ${tmpPaths.length} file(s)`)
      await delay(2000) // 업로드 대기
    } else {
      log('warn', 'br-reply', 'File input not found — skipping attachments')
    }
  } finally {
    // tmp 파일 정리
    for (const p of tmpPaths) {
      await unlink(p).catch(() => {})
    }
  }
}

// ─── Send 버튼 클릭 ──────────────────────────────────────
const clickSend = async (page: Page): Promise<void> => {
  const clicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('kat-button')
    for (const btn of Array.from(buttons)) {
      const label = btn.getAttribute('label') || btn.textContent || ''
      if (label.toLowerCase() === 'send') {
        const shadow = btn.shadowRoot
        if (shadow) {
          const inner = shadow.querySelector('button')
          if (inner) { inner.click(); return true }
        }
        ;(btn as HTMLElement).click()
        return true
      }
    }
    return false
  })

  if (!clicked) throw new Error('Send button not found')
  await delay(5000) // 전송 완료 대기
  log('info', 'br-reply', 'Send button clicked')
}

// ─── Close Case 실행 ─────────────────────────────────────
const closeCaseAction = async (page: Page): Promise<void> => {
  const clicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('kat-button')
    for (const btn of Array.from(buttons)) {
      const label = btn.getAttribute('label') || btn.textContent || ''
      if (label.toLowerCase().includes('close this case')) {
        const shadow = btn.shadowRoot
        if (shadow) {
          const inner = shadow.querySelector('button')
          if (inner) { inner.click(); return true }
        }
        ;(btn as HTMLElement).click()
        return true
      }
    }
    return false
  })

  if (!clicked) throw new Error('Close case button not found')
  await delay(3000)
  log('info', 'br-reply', 'Close case button clicked')
}

// ─── Main Job Processor ─────────────────────────────────
const processBrReplyJob = async (
  job: Job<BrReplyJobData>,
  reportResult: (result: BrReplyResult) => Promise<void>,
): Promise<void> => {
  const { reportId, brCaseId, text, attachments } = job.data

  log('info', 'br-reply', `Processing reply for case ${brCaseId} (report: ${reportId})`)

  if (!getBrowserPage) {
    throw new Error('Browser page accessor not set')
  }

  const { page, ensureLoggedIn } = await getBrowserPage()

  // 로그인 확인
  const loggedIn = await ensureLoggedIn(page)
  if (!loggedIn) {
    const result: BrReplyResult = {
      reportId,
      brCaseId,
      success: false,
      error: 'Session expired — login required',
      sentAt: null,
    }
    await reportResult(result)
    return
  }

  try {
    // 1. 케이스 상세 페이지 이동
    await openCaseDetail(page, brCaseId)
    await randomDelay(1000, 2000)

    // 2. Reply 버튼 클릭
    await clickReplyButton(page)
    await randomDelay(500, 1000)

    // 3. 텍스트 입력
    await fillReplyText(page, text)
    await randomDelay(500, 1000)

    // 4. 파일 첨부
    if (attachments.length > 0) {
      const supabaseUrl = process.env['SUPABASE_URL'] ?? ''
      const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
      await attachFiles(page, attachments, supabaseUrl, supabaseKey)
      await randomDelay(1000, 2000)
    }

    // 5. Send
    await clickSend(page)

    const sentAt = new Date().toISOString()
    log('info', 'br-reply', `Reply sent for case ${brCaseId}`)

    const result: BrReplyResult = {
      reportId,
      brCaseId,
      success: true,
      error: null,
      sentAt,
    }
    await reportResult(result)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    log('error', 'br-reply', `Reply failed for case ${brCaseId}: ${errorMsg}`)

    const result: BrReplyResult = {
      reportId,
      brCaseId,
      success: false,
      error: errorMsg,
      sentAt: null,
    }
    await reportResult(result)
    throw error // BullMQ가 재시도
  }
}

export { processBrReplyJob, setBrowserPageAccessor, closeCaseAction }
