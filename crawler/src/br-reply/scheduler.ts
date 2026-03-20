// BR Reply Scheduler — 2분마다 발송 대기 답장 폴링
import type { Queue } from 'bullmq'
import type { BrReplyJobData, BrReplyPendingReport } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const POLL_INTERVAL = 2 * 60 * 1000 // 2 minutes

const startBrReplyScheduler = (
  queue: Queue<BrReplyJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const replies = await sentinelClient.getPendingBrReplies()
      if (replies.length === 0) return

      log('info', 'br-reply-scheduler', `Found ${replies.length} pending BR replies`)

      for (const reply of replies as BrReplyPendingReport[]) {
        const jobId = `br-reply-${reply.report_id}`

        // 중복 방지
        const existing = await queue.getJob(jobId)
        if (existing) {
          const state = await existing.getState()
          if (['active', 'waiting', 'delayed'].includes(state)) continue
        }

        const jobData: BrReplyJobData = {
          reportId: reply.report_id,
          brCaseId: reply.br_case_id,
          text: reply.text,
          attachments: reply.attachments,
        }

        await queue.add('br-reply', jobData, { jobId })
        log('info', 'br-reply-scheduler', `Added BR reply job for report ${reply.report_id}`)
      }
    } catch (error) {
      log('error', 'br-reply-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Initial poll
  poll().catch(() => {})

  return setInterval(() => { poll().catch(() => {}) }, POLL_INTERVAL)
}

export { startBrReplyScheduler }
