// BR Monitor Scheduler — 30분마다 모니터링 대상 폴링하여 큐에 추가
import type { Queue } from 'bullmq'
import type { BrMonitorJobData, BrMonitorTarget } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const POLL_INTERVAL = 30 * 60 * 1000 // 30 minutes

type BrMonitorPendingReport = {
  report_id: string
  br_case_id: string
  br_case_status: string | null
  last_scraped_at: string | null
}

const startBrMonitorScheduler = (
  queue: Queue<BrMonitorJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const reports = await sentinelClient.getPendingBrMonitors()
      if (reports.length === 0) return

      log('info', 'br-monitor-scheduler', `Found ${reports.length} pending BR monitors`)

      // 모든 대상을 하나의 잡으로 묶어서 처리 (브라우저 1개 세션)
      const targets: BrMonitorTarget[] = (reports as BrMonitorPendingReport[]).map((r) => ({
        reportId: r.report_id,
        brCaseId: r.br_case_id,
        brCaseStatus: r.br_case_status,
        lastScrapedAt: r.last_scraped_at,
      }))

      const jobId = `br-monitor-${Date.now()}`

      // 이미 활성 잡이 있으면 스킵
      const active = await queue.getActiveCount()
      const waiting = await queue.getWaitingCount()
      if (active > 0 || waiting > 0) {
        log('info', 'br-monitor-scheduler', 'Monitor job already in queue — skipping')
        return
      }

      const jobData: BrMonitorJobData = { reports: targets }
      await queue.add('br-monitor', jobData, { jobId })
      log('info', 'br-monitor-scheduler', `Added BR monitor job with ${targets.length} targets`)
    } catch (error) {
      log('error', 'br-monitor-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Initial poll
  poll().catch(() => {})

  return setInterval(() => { poll().catch(() => {}) }, POLL_INTERVAL)
}

export { startBrMonitorScheduler }
