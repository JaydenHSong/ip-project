// SC Submit Scheduler — 2분마다 sc_submitting 리포트를 폴링하여 큐에 추가
import type { Queue } from 'bullmq'
import type { ScSubmitJobData } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

type ScPendingReport = {
  id: string
  sc_submit_data: {
    asin: string
    marketplace: string
    violation_type_sc: string
    description: string
    evidence_urls: string[]
    sc_rav_url: string
  } | null
}

const startScScheduler = (
  queue: Queue<ScSubmitJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const reports = await sentinelClient.getPendingScSubmits()
      if (reports.length === 0) return

      log('info', 'sc-scheduler', `Found ${reports.length} pending SC submits`)

      for (const report of reports as ScPendingReport[]) {
        if (!report.sc_submit_data) {
          log('warn', 'sc-scheduler', `Report ${report.id} has no sc_submit_data, skipping`)
          continue
        }

        const jobId = `sc-${report.id}`

        // Prevent duplicate jobs
        const existing = await queue.getJob(jobId)
        if (existing) {
          const state = await existing.getState()
          if (state === 'active' || state === 'waiting' || state === 'delayed') {
            continue
          }
        }

        const jobData: ScSubmitJobData = {
          reportId: report.id,
          asin: report.sc_submit_data.asin,
          marketplace: report.sc_submit_data.marketplace,
          violationTypeSc: report.sc_submit_data.violation_type_sc,
          description: report.sc_submit_data.description,
          evidenceUrls: report.sc_submit_data.evidence_urls,
          scRavUrl: report.sc_submit_data.sc_rav_url,
        }

        await queue.add('sc-submit', jobData, { jobId })
        log('info', 'sc-scheduler', `Added SC submit job for report ${report.id}`)
      }
    } catch (error) {
      log('error', 'sc-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Initial poll
  poll().catch(() => {})

  return setInterval(() => { poll().catch(() => {}) }, POLL_INTERVAL)
}

export { startScScheduler }
