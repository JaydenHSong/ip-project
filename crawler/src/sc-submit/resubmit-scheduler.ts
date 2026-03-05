// Resubmit Scheduler — 10분마다 unresolved 리포트 확인 → AI 강화 → SC 큐 추가
import type { Queue } from 'bullmq'
import type { ScSubmitJobData } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const POLL_INTERVAL = 10 * 60 * 1000 // 10 minutes

type ResubmitPendingReport = {
  id: string
  draft_body: string | null
  draft_title: string | null
  user_violation_type: string
  listing_id: string
  resubmit_count: number
  listings: {
    asin: string
    marketplace: string
    title: string | null
  } | null
}

const startResubmitScheduler = (
  queue: Queue<ScSubmitJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const result = await sentinelClient.getPendingResubmits()
      const reports = result.reports as ResubmitPendingReport[]

      if (reports.length === 0) return

      log('info', 'resubmit-scheduler', `Found ${reports.length} eligible resubmits`)

      for (const report of reports) {
        try {
          // 1. AI 강화
          await sentinelClient.strengthenDraft(report.id)
          log('info', 'resubmit-scheduler', `Strengthened draft for report ${report.id}`)

          // 2. sc_submitting으로 전환은 strengthen API에서 처리하거나 여기서 직접
          // For now, the SC queue will pick it up after strengthen sets status

          // 3. SC 큐에 추가
          if (report.listings) {
            const jobId = `sc-resubmit-${report.id}-${report.resubmit_count + 1}`
            const jobData: ScSubmitJobData = {
              reportId: report.id,
              asin: report.listings.asin,
              marketplace: report.listings.marketplace,
              violationTypeSc: report.user_violation_type,
              description: report.draft_body ?? '',
              evidenceUrls: [],
              scRavUrl: `https://sellercentral.amazon.com/reportabuse?asin=${report.listings.asin}`,
            }

            await queue.add('sc-resubmit', jobData, { jobId })
            log('info', 'resubmit-scheduler', `Queued resubmit for report ${report.id}`)
          }
        } catch (error) {
          log('error', 'resubmit-scheduler', `Failed to process resubmit for ${report.id}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    } catch (error) {
      log('error', 'resubmit-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return setInterval(() => { poll().catch(() => {}) }, POLL_INTERVAL)
}

export { startResubmitScheduler }
