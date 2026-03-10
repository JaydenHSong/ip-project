// PD Submit Scheduler — 2분마다 pd_submitting 리포트를 폴링하여 큐에 추가
import type { Queue } from 'bullmq'
import type { PdSubmitJobData } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

type PdPendingReport = {
  id: string
  pd_submit_data: {
    asin: string
    marketplace: string
    violation_type_pd: string
    description: string
    evidence_urls: string[]
    pd_rav_url: string
  } | null
}

const startPdScheduler = (
  queue: Queue<PdSubmitJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const reports = await sentinelClient.getPendingPdSubmits()
      if (reports.length === 0) return

      log('info', 'sc-scheduler', `Found ${reports.length} pending PD submits`)

      for (const report of reports as PdPendingReport[]) {
        if (!report.pd_submit_data) {
          log('warn', 'sc-scheduler', `Report ${report.id} has no pd_submit_data, skipping`)
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

        const jobData: PdSubmitJobData = {
          reportId: report.id,
          asin: report.pd_submit_data.asin,
          marketplace: report.pd_submit_data.marketplace,
          violationTypeSc: report.pd_submit_data.violation_type_pd,
          description: report.pd_submit_data.description,
          evidenceUrls: report.pd_submit_data.evidence_urls,
          scRavUrl: report.pd_submit_data.pd_rav_url,
        }

        await queue.add('pd-submit', jobData, { jobId })
        log('info', 'sc-scheduler', `Added PD submit job for report ${report.id}`)
      }
    } catch (error) {
      log('error', 'sc-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Initial poll
  poll().catch(() => {})

  return setInterval(() => { poll().catch(() => {}) }, POLL_INTERVAL)
}

export { startPdScheduler }
