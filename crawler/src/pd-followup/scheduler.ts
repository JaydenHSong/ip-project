// PD Follow-up Scheduler — 매일 12:00 PST (= 05:00 KST+1일)에 재방문 대상 폴링
import type { Queue } from 'bullmq'
import type { PdFollowupJobData, PdFollowupTarget } from './types.js'
import type { SentinelClient } from '../api/sentinel-client.js'
import { log } from '../logger.js'

const CHECK_INTERVAL = 60 * 60 * 1000 // 1시간마다 시간 체크
const TARGET_HOUR_PST = 12 // 낮 12시 PST

type PendingReport = {
  report_id: string
  listing_id: string
  asin: string
  marketplace: string
  url: string | null
  snapshot_count: number
}

const startPdFollowupScheduler = (
  queue: Queue<PdFollowupJobData>,
  sentinelClient: SentinelClient,
): ReturnType<typeof setInterval> => {
  const poll = async (): Promise<void> => {
    try {
      const data = await sentinelClient.getPendingFollowups()
      const reports = data.reports as PendingReport[]
      if (reports.length === 0) return

      log('info', 'pd-followup-scheduler', `Found ${reports.length} pending PD follow-ups`)

      // 이미 활성/대기 잡이 있으면 스킵
      const active = await queue.getActiveCount()
      const waiting = await queue.getWaitingCount()
      if (active > 0 || waiting > 0) {
        log('info', 'pd-followup-scheduler', 'Follow-up job already in queue — skipping')
        return
      }

      const targets: PdFollowupTarget[] = reports.map((r) => ({
        reportId: r.report_id,
        listingId: r.listing_id,
        asin: r.asin,
        marketplace: r.marketplace,
        url: r.url,
        snapshotCount: r.snapshot_count,
      }))

      const jobId = `pd-followup-${Date.now()}`
      await queue.add('pd-followup', { targets }, { jobId })
      log('info', 'pd-followup-scheduler', `Added PD follow-up job with ${targets.length} targets`)
    } catch (error) {
      log('error', 'pd-followup-scheduler', `Poll error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 매 1시간마다 체크, 12:00 PST이면 폴링 실행
  return setInterval(async () => {
    const pstHour = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false })
    if (Number(pstHour) === TARGET_HOUR_PST) {
      await poll()
    }
  }, CHECK_INTERVAL)
}

export { startPdFollowupScheduler }
