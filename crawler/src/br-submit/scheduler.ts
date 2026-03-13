// BR Submit Scheduler — 2분마다 br_submitting 리포트를 폴링하여 큐에 추가
import type { Queue } from 'bullmq'
import type { BrSubmitJobData, BrFormType } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

type BrPendingReport = {
  id: string
  br_submit_data: {
    form_type: BrFormType
    subject?: string
    description: string
    product_urls: string[]
    seller_storefront_url?: string
    policy_url?: string
    asins?: string[]
    order_id?: string
  } | null
}

const startBrScheduler = (
  queue: Queue<BrSubmitJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const reports = await sentinelClient.getPendingBrSubmits()
      if (reports.length === 0) return

      log('info', 'br-scheduler', `Found ${reports.length} pending BR submits`)

      for (const report of reports as BrPendingReport[]) {
        if (!report.br_submit_data) {
          log('warn', 'br-scheduler', `Report ${report.id} has no br_submit_data, skipping`)
          continue
        }

        // Check for active jobs to prevent concurrent processing
        const baseJobId = `br-${report.id}`
        const existing = await queue.getJob(baseJobId)
        if (existing) {
          const state = await existing.getState()
          if (state === 'active' || state === 'waiting' || state === 'delayed') {
            continue
          }
          // Remove stale completed/failed job
          await existing.remove().catch(() => {})
          // Wait for removal to propagate
          await new Promise((r) => setTimeout(r, 100))
        }

        const jobData: BrSubmitJobData = {
          reportId: report.id,
          formType: report.br_submit_data.form_type,
          subject: report.br_submit_data.subject,
          description: report.br_submit_data.description,
          productUrls: report.br_submit_data.product_urls,
          sellerStorefrontUrl: report.br_submit_data.seller_storefront_url,
          policyUrl: report.br_submit_data.policy_url,
          asins: report.br_submit_data.asins,
          orderId: report.br_submit_data.order_id,
        }

        const added = await queue.add('br-submit', jobData, { jobId: baseJobId })
        if (added) {
          log('info', 'br-scheduler', `Added BR submit job for report ${report.id} (jobId: ${added.id}, state: queued)`)
        } else {
          log('warn', 'br-scheduler', `Failed to add job for report ${report.id} — job may already exist`)
        }
      }
    } catch (error) {
      log('error', 'br-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Initial poll
  poll().catch(() => {})

  return setInterval(() => { poll().catch(() => {}) }, POLL_INTERVAL)
}

export { startBrScheduler }
