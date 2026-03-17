import type {
  Campaign,
  CrawlerListingRequest,
  CrawlerListingResponse,
  CrawlerBatchResponse,
  CrawlerLogRequest,
} from '../types/index.js'
import type { PersonaRanges } from '../anti-bot/persona-ranges.js'
import { log } from '../logger.js'

type BrSubmitResult = {
  reportId: string
  success: boolean
  brCaseId: string | null
  error: string | null
}

type BrReplyResultData = {
  reportId: string
  brCaseId: string
  success: boolean
  error: string | null
  sentAt: string | null
}

type BrMonitorResultData = {
  reportId: string
  brCaseId: string
  brCaseStatus: string
  newMessages: Array<{
    direction: 'inbound' | 'outbound'
    sender: string
    body: string
    sentAt: string
  }>
  lastAmazonReplyAt: string | null
}

type CampaignResultUpdate = {
  found: number
  sent: number
  duplicates: number
  errors: number
  spigen_skipped: number
  pages_crawled: number
  violations_suspected: number
  duration_ms: number
  persona_name: string
  success: boolean
}

type SentinelClient = {
  getActiveCampaigns: () => Promise<Campaign[]>
  verifyCampaignExists: (campaignId: string) => Promise<boolean>
  verifyReportExists: (reportId: string) => Promise<boolean>
  submitListing: (data: CrawlerListingRequest) => Promise<CrawlerListingResponse>
  submitBatch: (listings: CrawlerListingRequest[]) => Promise<CrawlerBatchResponse>
  submitLog: (logData: CrawlerLogRequest) => Promise<void>
  updateCampaignResult: (campaignId: string, result: CampaignResultUpdate) => Promise<void>
  getPersonaRanges: () => Promise<PersonaRanges | null>
  getPendingBrSubmits: () => Promise<unknown[]>
  reportBrResult: (result: BrSubmitResult) => Promise<void>
  getPendingBrMonitors: () => Promise<unknown[]>
  reportBrMonitorResult: (data: BrMonitorResultData) => Promise<void>
  getPendingBrReplies: () => Promise<unknown[]>
  reportBrReplyResult: (data: BrReplyResultData) => Promise<void>
  getCaseIdMissing: () => Promise<CaseIdMissingReport[]>
  reportCaseIdRecovery: (data: { report_id: string; br_case_id: string | null }) => Promise<void>
}

type CaseIdMissingReport = {
  report_id: string
  draft_title: string | null
  asin: string | null
  submitted_at: string | null
  retry_count: number
}

const API_RETRY_MAX = 3
const API_RETRY_DELAY = 5_000

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries: number = API_RETRY_MAX,
): Promise<Response> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)

      // 409 중복은 재시도하지 않음
      if (response.status === 409) return response
      // 4xx 에러는 재시도하지 않음
      if (response.status >= 400 && response.status < 500) return response

      // 5xx 에러는 재시도
      if (response.status >= 500 && attempt < retries) {
        log('warn', 'api-client', `API returned ${response.status}, retrying (${attempt}/${retries})`)
        await sleep(API_RETRY_DELAY * attempt)
        continue
      }

      return response
    } catch (error) {
      if (attempt < retries) {
        log('warn', 'api-client', `Network error, retrying (${attempt}/${retries})`, {
          error: error instanceof Error ? error.message : String(error),
        })
        await sleep(API_RETRY_DELAY * attempt)
        continue
      }
      throw error
    }
  }

  throw new Error('Max retries exceeded')
}

const createSentinelClient = (apiUrl: string, serviceToken: string): SentinelClient => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceToken}`,
  }

  const baseUrl = apiUrl.replace(/\/$/, '')

  return {
    verifyCampaignExists: async (campaignId: string): Promise<boolean> => {
      try {
        const response = await fetch(`${baseUrl}/api/campaigns/${campaignId}`, {
          method: 'GET',
          headers,
        })
        return response.ok
      } catch {
        // 네트워크 에러 시 존재한다고 가정 (안전 방향)
        return true
      }
    },

    verifyReportExists: async (reportId: string): Promise<boolean> => {
      try {
        const response = await fetch(`${baseUrl}/api/reports/${reportId}`, {
          method: 'GET',
          headers,
        })
        return response.ok
      } catch {
        return true
      }
    },

    getActiveCampaigns: async (): Promise<Campaign[]> => {
      log('info', 'api-client', 'Fetching active campaigns')

      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/campaigns`,
        { method: 'GET', headers },
      )

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to fetch campaigns: ${response.status} ${body}`)
      }

      const data = (await response.json()) as { campaigns: Campaign[] }
      log('info', 'api-client', `Fetched ${data.campaigns.length} active campaigns`)
      return data.campaigns
    },

    submitListing: async (listing: CrawlerListingRequest): Promise<CrawlerListingResponse> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/listings`,
        { method: 'POST', headers, body: JSON.stringify(listing) },
      )

      if (response.status === 409) {
        throw new Error('API_DUPLICATE')
      }

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to submit listing: ${response.status} ${body}`)
      }

      return (await response.json()) as CrawlerListingResponse
    },

    submitBatch: async (listings: CrawlerListingRequest[]): Promise<CrawlerBatchResponse> => {
      log('info', 'api-client', `Submitting batch of ${listings.length} listings`)

      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/listings/batch`,
        { method: 'POST', headers, body: JSON.stringify({ listings }) },
      )

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to submit batch: ${response.status} ${body}`)
      }

      const result = (await response.json()) as CrawlerBatchResponse
      log('info', 'api-client', `Batch result — created: ${result.created}, duplicates: ${result.duplicates}, errors: ${result.errors.length}`)
      return result
    },

    submitLog: async (logData: CrawlerLogRequest): Promise<void> => {
      try {
        await fetch(`${baseUrl}/api/crawler/logs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(logData),
        })
      } catch {
        // fire-and-forget: 로그 전송 실패해도 크롤링 계속
        log('warn', 'api-client', 'Failed to submit crawler log (non-fatal)')
      }
    },

    updateCampaignResult: async (campaignId: string, result: CampaignResultUpdate): Promise<void> => {
      try {
        await fetchWithRetry(
          `${baseUrl}/api/crawler/campaigns/${campaignId}/result`,
          { method: 'PATCH', headers, body: JSON.stringify(result) },
        )
      } catch {
        log('warn', 'api-client', 'Failed to update campaign result (non-fatal)')
      }
    },

    getPersonaRanges: async (): Promise<PersonaRanges | null> => {
      try {
        const response = await fetch(`${baseUrl}/api/ai/persona-ranges`, {
          method: 'GET',
          headers,
        })
        if (!response.ok) return null
        const data = (await response.json()) as { ranges: PersonaRanges | null }
        return data.ranges
      } catch {
        return null
      }
    },

    getPendingBrSubmits: async (): Promise<unknown[]> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-pending`,
        { method: 'GET', headers },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to fetch BR pending: ${response.status} ${body}`)
      }
      const data = (await response.json()) as { reports: unknown[] }
      return data.reports
    },

    reportBrResult: async (result: BrSubmitResult): Promise<void> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-result`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            report_id: result.reportId,
            success: result.success,
            br_case_id: result.brCaseId,
            error: result.error,
          }),
        },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to report BR result: ${response.status} ${body}`)
      }
    },

    getPendingBrMonitors: async (): Promise<unknown[]> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-monitor-pending`,
        { method: 'GET', headers },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to fetch BR monitor pending: ${response.status} ${body}`)
      }
      const data = (await response.json()) as { reports: unknown[] }
      return data.reports
    },

    reportBrMonitorResult: async (data: BrMonitorResultData): Promise<void> => {
      const payload = {
        report_id: data.reportId,
        br_case_id: data.brCaseId,
        br_case_status: data.brCaseStatus,
        new_messages: data.newMessages.map((m) => ({
          direction: m.direction,
          sender: m.sender,
          body: m.body,
          sent_at: m.sentAt,
        })),
        last_amazon_reply_at: data.lastAmazonReplyAt,
      }
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-monitor-result`,
        { method: 'POST', headers, body: JSON.stringify(payload) },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to report BR monitor result: ${response.status} ${body}`)
      }
    },

    getPendingBrReplies: async (): Promise<unknown[]> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-reply-pending`,
        { method: 'GET', headers },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to fetch BR reply pending: ${response.status} ${body}`)
      }
      const data = (await response.json()) as { replies: unknown[] }
      return data.replies
    },

    reportBrReplyResult: async (data: BrReplyResultData): Promise<void> => {
      const payload = {
        report_id: data.reportId,
        br_case_id: data.brCaseId,
        success: data.success,
        error: data.error,
        sent_at: data.sentAt,
      }
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-reply-result`,
        { method: 'POST', headers, body: JSON.stringify(payload) },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to report BR reply result: ${response.status} ${body}`)
      }
    },

    getCaseIdMissing: async (): Promise<CaseIdMissingReport[]> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-case-id-missing`,
        { method: 'GET', headers },
      )
      if (!response.ok) return []
      const data = (await response.json()) as { reports?: CaseIdMissingReport[] }
      return data.reports ?? []
    },

    reportCaseIdRecovery: async (data: { report_id: string; br_case_id: string | null }): Promise<void> => {
      const response = await fetchWithRetry(
        `${baseUrl}/api/crawler/br-case-id-recovery`,
        { method: 'POST', headers, body: JSON.stringify(data) },
      )
      if (!response.ok) {
        const body = await response.text()
        throw new Error(`Failed to report case ID recovery: ${response.status} ${body}`)
      }
    },

  }
}

export { createSentinelClient }
export type { SentinelClient, CaseIdMissingReport }
